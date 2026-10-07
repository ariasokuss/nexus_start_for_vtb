"""Фейковый банк в памяти: балансы и история операций демо-персонажей.

Для демо этого достаточно. TODO(тимлид): перенести состояние в PostgreSQL (app/db),
когда понадобится несколько параллельных показов.
"""
import uuid
from dataclasses import dataclass, field
from datetime import datetime, timedelta

from app import content
from app.schemas import Persona, Transaction


@dataclass
class Account:
    persona: Persona
    transactions: list[Transaction] = field(default_factory=list)
    outgoing_paused_until: datetime | None = None
    xp: int = 0

    @property
    def balance(self) -> float:
        return self.persona.balance

    def known_counterparties(self) -> set[str]:
        return {t.counterparty for t in self.transactions}


class FakeBank:
    def __init__(self) -> None:
        self._accounts: dict[str, Account] = {}

    def reset(self, persona_id: str) -> Account:
        raw = content.personas()[persona_id]
        persona = Persona(**{k: raw[k] for k in Persona.model_fields if k in raw})
        account = Account(persona=persona)
        now = datetime.now()
        for h in raw.get("history", []):
            account.transactions.append(
                Transaction(
                    id=uuid.uuid4().hex[:8],
                    ts=now - timedelta(days=h.get("days_ago", 1)),
                    amount=h["amount"],
                    direction=h["direction"],
                    counterparty=h["counterparty"],
                    is_new_counterparty=False,
                    channel=h.get("channel", "sbp"),
                )
            )
        self._accounts[persona_id] = account
        return account

    def get(self, persona_id: str) -> Account:
        if persona_id not in self._accounts:
            return self.reset(persona_id)
        return self._accounts[persona_id]

    def incoming(self, persona_id: str, amount: float, counterparty: str, is_new: bool) -> Transaction:
        account = self.get(persona_id)
        tx = Transaction(
            id=uuid.uuid4().hex[:8],
            ts=datetime.now(),
            amount=amount,
            direction="in",
            counterparty=counterparty,
            is_new_counterparty=is_new,
        )
        account.transactions.append(tx)
        account.persona.balance += amount
        return tx

    def outgoing(self, persona_id: str, amount: float, to: str) -> Transaction:
        account = self.get(persona_id)
        tx = Transaction(
            id=uuid.uuid4().hex[:8],
            ts=datetime.now(),
            amount=amount,
            direction="out",
            counterparty=to,
            is_new_counterparty=to not in account.known_counterparties(),
        )
        account.transactions.append(tx)
        account.persona.balance -= amount
        return tx

    def freeze(self, persona_id: str, operation_id: str) -> Transaction | None:
        account = self.get(persona_id)
        for tx in account.transactions:
            if tx.id == operation_id and tx.direction == "in":
                tx.frozen = True
                return tx
        return None

    def last_suspicious_incoming(self, persona_id: str) -> Transaction | None:
        account = self.get(persona_id)
        for tx in reversed(account.transactions):
            if tx.direction == "in" and tx.is_new_counterparty and not tx.frozen:
                return tx
        return None


bank = FakeBank()
