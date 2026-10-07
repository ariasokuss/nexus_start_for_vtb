import uuid
from datetime import datetime, timedelta

from fastapi import APIRouter

from app import content
from app.schemas import (
    EvidenceRequest,
    PersonaRequest,
    ReportRequest,
    ReportResponse,
    ReturnFundsRequest,
    ReturnFundsResponse,
)
from app.services.bank import bank
from app.services.demo import engine

router = APIRouter(prefix="/api/sos", tags=["sos"])

# В демо доказательства лежат в памяти. В реальной версии — шифрование и передача в банк только по согласию.
_evidence: dict[str, list[str]] = {}


@router.get("/branches")
def branches():
    return content.sos_branches()


@router.get("/legal")
def legal():
    return list(content.legal().values())


@router.post("/return-funds", response_model=ReturnFundsResponse)
def return_funds(req: ReturnFundsRequest):
    tx = bank.freeze(req.persona_id, req.operation_id)
    engine.publish_for_persona(req.persona_id)
    if not tx:
        return ReturnFundsResponse(claim_id="", frozen_amount=0, status="not_found")
    return ReturnFundsResponse(claim_id=f"CLM-{uuid.uuid4().hex[:6].upper()}", frozen_amount=tx.amount, status="frozen")


@router.post("/evidence")
def evidence(req: EvidenceRequest):
    evidence_id = f"EV-{uuid.uuid4().hex[:6].upper()}"
    _evidence[evidence_id] = req.images_base64
    return {"evidence_id": evidence_id, "count": len(req.images_base64)}


@router.post("/pause-outgoing")
def pause_outgoing(req: PersonaRequest):
    account = bank.get(req.persona_id)
    account.outgoing_paused_until = datetime.now() + timedelta(hours=24)
    return {"paused_until": account.outgoing_paused_until}


@router.post("/report", response_model=ReportResponse)
def report(req: ReportRequest):
    """Черновик обращения в банк / заявления в полицию с хронологией операций.

    TODO(тимлид): отдельные шаблоны по веткам A–D в content/sos/.
    """
    account = bank.get(req.persona_id)
    lines = []
    for t in account.transactions[-10:]:
        sign = "+" if t.direction == "in" else "-"
        lines.append(f"{t.ts:%d.%m %H:%M} {sign}{t.amount:.0f} ₽ — {t.counterparty}")
    draft = (
        f"Я, {account.persona.name}, сообщаю, что меня пытались использовать для перевода чужих денег.\n"
        "Хронология операций:\n" + "\n".join(lines) + "\nПереписку прилагаю."
    )
    return ReportResponse(draft_text=draft, attachments=list(_evidence))
