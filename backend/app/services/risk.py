"""Скоринг перевода в момент попытки.

Сейчас — прозрачные правила (бейзлайн). TODO(Даша): заменить/дополнить CatBoost-моделью
из ml/ (признаки — ml/src/features.py), причины — из SHAP через словарь фраз.
"""
from datetime import datetime

from app.schemas import LiveRisk, Risk, Transaction
from app.services.bank import Account

HIGH, MEDIUM = 0.7, 0.4


def _level(score: float) -> str:
    return "high" if score >= HIGH else "medium" if score >= MEDIUM else "low"


def _rub(x: float) -> str:
    return f"{x:,.0f}".replace(",", " ") + " ₽"


def _recent_stranger_incoming(txs: list[Transaction], now: datetime, minutes: int = 60) -> Transaction | None:
    for tx in reversed(txs):
        if tx.direction == "in" and tx.is_new_counterparty and not tx.frozen:
            if (now - tx.ts).total_seconds() <= minutes * 60:
                return tx
    return None


def score_transfer(account: Account, to: str, amount: float) -> Risk:
    now = datetime.now()
    score, reasons = 0.0, []

    incoming = _recent_stranger_incoming(account.transactions, now)
    if incoming:
        mins = max(1, int((now - incoming.ts).total_seconds() // 60))
        score += 0.35
        reasons.append(f"{_rub(incoming.amount)} пришли от незнакомца {mins} мин назад")
        share = amount / incoming.amount
        if share >= 0.7:
            score += 0.3
            reasons.append(f"Ты переводишь {min(share, 1):.0%} этой суммы дальше")

    if to not in account.known_counterparties():
        score += 0.15
        reasons.append("Новый получатель, раньше переводов ему не было")

    if account.persona.age < 18:
        score += 0.1
        reasons.append(f"Клиенту {account.persona.age} лет")

    day_senders = {
        t.counterparty for t in account.transactions
        if t.direction == "in" and t.is_new_counterparty and (now - t.ts).days < 1
    }
    if len(day_senders) >= 3:
        score += 0.2
        reasons.append(f"{len(day_senders)} переводов от разных незнакомцев за сутки")

    score = round(min(score, 1.0), 2)
    return Risk(score=score, level=_level(score), reasons=reasons)


def live_risk(account: Account) -> LiveRisk:
    """Риск «прямо сейчас» для правой панели демо — без конкретного перевода."""
    now = datetime.now()
    score, signals = 0.05, []
    incoming = _recent_stranger_incoming(account.transactions, now)
    if incoming:
        score += 0.4
        signals.append(f"Зачисление {_rub(incoming.amount)} от незнакомого отправителя")
        if account.persona.age < 18:
            score += 0.1
            signals.append(f"Клиенту {account.persona.age} лет")
    outs_after = [
        t for t in account.transactions
        if incoming and t.direction == "out" and t.ts >= incoming.ts
    ]
    if outs_after:
        score += 0.35
        signals.append("Деньги уходят дальше вскоре после зачисления (транзит)")
    score = round(min(score, 1.0), 2)
    return LiveRisk(persona_id=account.persona.id, score=score, level=_level(score), signals=signals)
