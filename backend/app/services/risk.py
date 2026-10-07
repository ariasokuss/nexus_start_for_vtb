"""Скоринг операций по профилю клиента. Алгоритм в два этапа:

1. Зачисление (score_incoming): сравниваем с обычным поведением — знаком ли отправитель,
   во сколько раз сумма больше среднего пополнения. Подозрительное зачисление не блокируем
   (банк не может запретить получить деньги), а помечаем и предупреждаем.
2. Перевод (score_transfer): если помеченные деньги пытаются переслать дальше — это транзит,
   типичный для дропа. При высоком риске перевод перехватывается.

Сейчас — прозрачные правила (бейзлайн). TODO(Даша): заменить/дополнить CatBoost-моделью
из ml/ (признаки — ml/src/features.py), причины — из SHAP через словарь фраз.
"""
from datetime import datetime, timedelta

from app.schemas import LiveRisk, Profile, Risk, Transaction
from app.services.bank import Account

HIGH, MEDIUM = 0.7, 0.4
SUSPICIOUS_WINDOW = timedelta(hours=24)  # сколько помним подозрительное зачисление
TRANSIT_FAST_MINUTES = 60


def _level(score: float) -> str:
    return "high" if score >= HIGH else "medium" if score >= MEDIUM else "low"


def _rub(x: float) -> str:
    return f"{x:,.0f}".replace(",", " ") + " ₽"


def _times(x: float) -> str:
    """«в 20 раз», «в 2,5 раза», «в 3 раза»."""
    n = round(x) if x >= 3 else round(x, 1)
    if n != int(n):
        return f"в {str(n).replace('.', ',')} раза"
    n = int(n)
    word = "раза" if n % 10 in (2, 3, 4) and n % 100 not in (12, 13, 14) else "раз"
    return f"в {n} {word}"


def _baseline(account: Account) -> list[Transaction]:
    """Операции, по которым считаем «обычное поведение»: без подозрительных и без операций с незнакомцами."""
    return [t for t in account.transactions if not t.flagged and not t.is_new_counterparty]


def profile(account: Account) -> Profile:
    base = _baseline(account)
    ins = [t.amount for t in base if t.direction == "in"]
    outs = [t.amount for t in base if t.direction == "out"]
    senders = list(dict.fromkeys(t.counterparty for t in base if t.direction == "in"))
    recipients = list(dict.fromkeys(t.counterparty for t in base if t.direction == "out" and t.channel == "sbp"))

    transit = None
    for i, t in enumerate(account.transactions):
        if t.direction == "in" and (t.flagged or t.is_new_counterparty):
            nxt = next((o for o in account.transactions[i + 1:] if o.direction == "out"), None)
            if nxt:
                mins = max(1, int((nxt.ts - t.ts).total_seconds() // 60))
                transit = mins if transit is None else min(transit, mins)

    return Profile(
        avg_topup=round(sum(ins) / len(ins)) if ins else 0,
        avg_spend=round(sum(outs) / len(outs)) if outs else 0,
        known_senders=senders,
        known_recipients=recipients,
        min_transit_minutes=transit,
    )


def _suspicious_incoming(account: Account, now: datetime) -> Transaction | None:
    for tx in reversed(account.transactions):
        if tx.direction == "in" and (tx.flagged or tx.is_new_counterparty) and not tx.frozen:
            if now - tx.ts <= SUSPICIOUS_WINDOW:
                return tx
    return None


def _strangers_today(account: Account, now: datetime) -> set[str]:
    return {
        t.counterparty for t in account.transactions
        if t.direction == "in" and t.is_new_counterparty and now - t.ts < timedelta(days=1)
    }


def score_incoming(account: Account, amount: float, sender: str, is_new: bool) -> Risk:
    """Этап 1: насколько зачисление выбивается из обычного поведения клиента."""
    p = profile(account)
    now = datetime.now()
    score, reasons = 0.0, []

    # «Незнакомость» решает вызывающий код: для ручного пополнения — по кругу отправителей,
    # для сценария — по флагу события (новый работодатель Кати — не повод для тревоги)
    stranger = is_new
    if stranger:
        score += 0.35
        reasons.append(f"Отправитель «{sender}» раньше вам не переводил")

    if p.avg_topup:
        ratio = amount / p.avg_topup
        if ratio >= 5:
            score += 0.3
            reasons.append(f"Сумма {_times(ratio)} больше вашего обычного пополнения ({_rub(p.avg_topup)})")
        elif ratio >= 2.5:
            score += 0.15
            reasons.append(f"Сумма {_times(ratio)} больше обычного пополнения ({_rub(p.avg_topup)})")

    if stranger and account.persona.age < 18:
        score += 0.1
        reasons.append(f"Клиенту {account.persona.age} лет — подростков чаще вербуют в дропы")

    strangers = _strangers_today(account, now) | ({sender} if stranger else set())
    if stranger and len(strangers) >= 2:
        score += 0.2
        reasons.append(f"{len(strangers)} зачисления от разных незнакомцев за сутки")

    score = round(min(score, 1.0), 2)
    return Risk(score=score, level=_level(score), reasons=reasons)


def score_transfer(account: Account, to: str, amount: float) -> Risk:
    """Этап 2: не пытаются ли переслать подозрительные деньги дальше."""
    p = profile(account)
    now = datetime.now()
    score, reasons = 0.0, []

    incoming = _suspicious_incoming(account, now)
    if incoming:
        mins = max(1, int((now - incoming.ts).total_seconds() // 60))
        when = f"{mins} мин назад" if mins < 120 else f"{mins // 60} ч назад"
        score += 0.35
        reasons.append(f"{_rub(incoming.amount)} пришли от незнакомого отправителя {when}")
        share = amount / incoming.amount
        if share >= 0.7:
            score += 0.3
            reasons.append(f"Вы переводите {min(share, 1):.0%} этой суммы дальше")
        if mins <= TRANSIT_FAST_MINUTES:
            score += 0.1
            reasons.append("Деньги уходят дальше почти сразу после зачисления — так работает транзит")

    if to not in p.known_recipients and to not in account.known_counterparties():
        score += 0.15
        reasons.append("Новый получатель, раньше вы ему не переводили")

    if p.avg_spend and amount / p.avg_spend >= 5:
        score += 0.15
        reasons.append(f"Сумма {_times(amount / p.avg_spend)} больше ваших обычных трат ({_rub(p.avg_spend)})")

    if account.persona.age < 18 and incoming:
        score += 0.1
        reasons.append(f"Клиенту {account.persona.age} лет")

    strangers = _strangers_today(account, now)
    if len(strangers) >= 3:
        score += 0.2
        reasons.append(f"{len(strangers)} переводов от разных незнакомцев за сутки")

    score = round(min(score, 1.0), 2)
    return Risk(score=score, level=_level(score), reasons=reasons)


def live_risk(account: Account) -> LiveRisk:
    """Риск «прямо сейчас» для панели «Что видит банк» — без конкретного перевода."""
    now = datetime.now()
    score, signals = 0.05, []

    incoming = _suspicious_incoming(account, now)
    if incoming:
        # Оцениваем зачисление относительно истории ДО него
        before = Account(persona=account.persona, transactions=[t for t in account.transactions if t.ts < incoming.ts])
        r = score_incoming(before, incoming.amount, incoming.counterparty, incoming.is_new_counterparty)
        score += r.score
        signals += r.reasons
        outs_after = [t for t in account.transactions if t.direction == "out" and t.ts >= incoming.ts]
        if outs_after:
            score += 0.35
            signals.append("Деньги уходят дальше вскоре после зачисления (транзит)")

    if account.last_intercept:
        score = max(score, account.last_intercept.score)
        signals.append("Перевод остановлен: " + account.last_intercept.reasons[0].lower()
                       if account.last_intercept.reasons else "Перевод остановлен")

    frozen = [t for t in account.transactions if t.frozen]
    if frozen:
        signals.append(f"Заморожено {_rub(sum(t.amount for t in frozen))} — банк вернёт отправителю")
        score = min(score, 0.3)

    score = round(min(score, 1.0), 2)
    return LiveRisk(
        persona_id=account.persona.id, score=score, level=_level(score), signals=signals, profile=profile(account)
    )
