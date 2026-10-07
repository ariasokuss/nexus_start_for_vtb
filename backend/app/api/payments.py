from datetime import datetime

from fastapi import APIRouter, HTTPException

from app import content
from app.schemas import Intercept, LiveRisk, Persona, Transaction, TransferRequest, TransferResponse
from app.services import risk as risk_service
from app.services.bank import bank
from app.services.demo import engine

router = APIRouter(prefix="/api", tags=["bank"])


def _check(persona_id: str) -> None:
    if persona_id not in content.personas():
        raise HTTPException(404, f"Нет персонажа {persona_id}")


@router.get("/personas", response_model=list[Persona])
def personas():
    return [bank.get(pid).persona for pid in content.personas()]


@router.get("/personas/{persona_id}/transactions", response_model=list[Transaction])
def transactions(persona_id: str):
    _check(persona_id)
    return bank.get(persona_id).transactions


@router.post("/payments/transfer", response_model=TransferResponse)
def transfer(req: TransferRequest):
    _check(req.persona_id)
    account = bank.get(req.persona_id)
    if account.outgoing_paused_until and account.outgoing_paused_until > datetime.now():
        raise HTTPException(423, "Исходящие переводы на паузе по твоей просьбе")

    risk = risk_service.score_transfer(account, req.to, req.amount)
    if risk.level == "high":
        legal = content.legal()
        intercept = Intercept(
            title="Стоп, подожди",
            text="Похоже, тебя используют как «дропа»: через твою карту хотят провести чужие деньги.",
            consequences=[legal[k]["short"] for k in ("card_block", "cbr_base", "uk187") if k in legal],
            actions=["cancel", "offered_job", "check_message", "continue"],
        )
        engine.publish_for_persona(req.persona_id)
        return TransferResponse(status="intercepted", risk=risk, intercept=intercept, balance=account.balance)

    bank.outgoing(req.persona_id, req.amount, req.to)
    engine.publish_for_persona(req.persona_id)
    return TransferResponse(status="ok", risk=risk, balance=account.balance)


@router.get("/risk/{persona_id}/live", response_model=LiveRisk)
def live(persona_id: str):
    _check(persona_id)
    return risk_service.live_risk(bank.get(persona_id))
