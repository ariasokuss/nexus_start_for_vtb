"""Скоринг перевода в момент попытки.

Признаки — app/ml/features.py (те же, на которых учится модель в ml/).
Если обученная CatBoost-модель есть (app/ml/models/risk.cbm) — score и причины из неё (причины через SHAP),
иначе — прозрачные правила с баллами (rule_score).
"""
from datetime import datetime

from app import content
from app.ml import risk_model
from app.ml.features import Transfer, build_features, rule_score
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


def _card_age_days(account: Account, now: datetime) -> float:
    raw = content.personas().get(account.persona.id, {})
    if "card_age_days" in raw:
        return raw["card_age_days"]
    first = min((t.ts for t in account.transactions), default=now)
    return (now - first).total_seconds() / 86400


def transfer_features(account: Account, to: str, amount: float, now: datetime | None = None) -> dict:
    now = now or datetime.now()
    history = sorted((t for t in account.transactions if t.ts <= now), key=lambda t: t.ts)
    return build_features(history, Transfer(ts=now, amount=amount, to=to), account.persona.age, _card_age_days(account, now))


def score_transfer(account: Account, to: str, amount: float) -> Risk:
    features = transfer_features(account, to, amount)
    if risk_model.available():
        score, reasons = risk_model.predict(features)
    else:
        score, reasons = rule_score(features)
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
