import random
from datetime import datetime

from fastapi import APIRouter, HTTPException

from app import content
from app.schemas import (
    Intercept,
    LiveRisk,
    OperationResponse,
    PaymentRequest,
    Persona,
    Profile,
    Risk,
    TopUpRequest,
    Transaction,
    TransferRequest,
    TransferResponse,
)
from app.services import risk as risk_service
from app.services.bank import bank
from app.services.demo import engine

router = APIRouter(prefix="/api", tags=["bank"])

# Имена «неизвестных» отправителей в песочнице — так выглядят переводы от дропов-вербовщиков
STRANGER_NAMES = ["Иван К.", "Олег П.", "Марина С.", "Руслан Т.", "Алина В.", "Тимур Н."]


def _check(persona_id: str) -> None:
    if persona_id not in content.personas():
        raise HTTPException(404, f"Нет персонажа {persona_id}")


@router.get("/personas", response_model=list[Persona])
def personas():
    return [bank.get(pid).persona for pid in content.personas()]


@router.post("/personas/{persona_id}/reset", response_model=Persona)
def reset_persona(persona_id: str):
    _check(persona_id)
    persona = bank.reset(persona_id).persona
    engine.publish_for_persona(persona_id)
    return persona


@router.get("/personas/{persona_id}/transactions", response_model=list[Transaction])
def transactions(persona_id: str):
    _check(persona_id)
    return bank.get(persona_id).transactions


@router.get("/personas/{persona_id}/profile", response_model=Profile)
def persona_profile(persona_id: str):
    _check(persona_id)
    return risk_service.profile(bank.get(persona_id))


@router.post("/payments/topup", response_model=OperationResponse)
def topup(req: TopUpRequest):
    """Этап 1 алгоритма: зачисление проходит всегда, но подозрительное — помечается."""
    _check(req.persona_id)
    account = bank.get(req.persona_id)
    is_new = req.sender not in risk_service.profile(account).known_senders
    sender = random.choice(STRANGER_NAMES) if req.sender == "Неизвестный" else req.sender

    risk = risk_service.score_incoming(account, req.amount, sender, is_new)
    flagged = risk.level != "low"
    tx = bank.incoming(req.persona_id, req.amount, sender, is_new, flagged=flagged)
    engine.publish_for_persona(req.persona_id)

    if flagged:
        message = (
            "Зачисление выглядит необычно. Не переводите эти деньги дальше, даже «обратно» по просьбе "
            "отправителя — сначала разберитесь, откуда они."
        )
    else:
        message = "Зачисление в пределах вашего обычного поведения."
    return OperationResponse(
        status="flagged" if flagged else "ok", transaction=tx, risk=risk, message=message, balance=account.balance
    )


@router.post("/payments/pay", response_model=OperationResponse)
def pay(req: PaymentRequest):
    """Оплата покупки картой. Покупки в магазинах — не транзит, отдельного скоринга не требуют."""
    _check(req.persona_id)
    account = bank.get(req.persona_id)
    empty = Risk(score=0, level="low", reasons=[])
    if req.amount > bank.available(req.persona_id):
        return OperationResponse(status="rejected", risk=empty, message="Недостаточно средств", balance=account.balance)
    tx = bank.outgoing(req.persona_id, req.amount, req.merchant, channel="card", category=req.category)
    engine.publish_for_persona(req.persona_id)
    return OperationResponse(status="ok", transaction=tx, risk=empty, message="Оплачено", balance=account.balance)


@router.post("/payments/transfer", response_model=TransferResponse)
def transfer(req: TransferRequest):
    """Этап 2 алгоритма: перевод подозрительных денег дальше перехватывается."""
    _check(req.persona_id)
    account = bank.get(req.persona_id)
    if account.outgoing_paused_until and account.outgoing_paused_until > datetime.now():
        raise HTTPException(423, "Исходящие переводы на паузе по вашей просьбе")
    if req.amount > bank.available(req.persona_id):
        raise HTTPException(422, "Недостаточно средств: замороженные суммы переводить нельзя")

    risk = risk_service.score_transfer(account, req.to, req.amount)
    if risk.level == "high" and not req.confirmed:
        legal = content.legal()
        intercept = Intercept(
            title="Перевод остановлен",
            text="Похоже, через вашу карту хотят провести чужие деньги. Так вербуют «дропов» — "
            "и отвечать за такие переводы будет владелец карты.",
            consequences=[legal[k]["short"] for k in ("card_block", "cbr_base", "uk187") if k in legal],
            actions=["cancel", "offered_job", "check_message", "continue"],
        )
        account.last_intercept = risk
        engine.publish_for_persona(req.persona_id)
        return TransferResponse(status="intercepted", risk=risk, intercept=intercept, balance=account.balance)

    bank.outgoing(req.persona_id, req.amount, req.to)
    account.last_intercept = None
    engine.publish_for_persona(req.persona_id)
    return TransferResponse(status="ok", risk=risk, balance=account.balance)


@router.get("/risk/{persona_id}/live", response_model=LiveRisk)
def live(persona_id: str):
    _check(persona_id)
    return risk_service.live_risk(bank.get(persona_id))
