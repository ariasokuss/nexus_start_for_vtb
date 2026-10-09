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
    SosActionRequest,
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


# Действия «Безопасного выхода», которые в демо только фиксируются (реальной интеграции нет)
ACTION_RESULTS = {
    "block_contact": "Контакт заблокирован, переписка сохранена",
    "evidence": "Переписка сохранена и прикреплена к обращению",
    "notify_parent": "Готов текст сообщения для взрослого — отправка по вашему решению",
    "report_bank": "Обращение в банк отправлено вместе с хронологией операций",
    "report_police": "Черновик заявления в полицию готов, список доказательств приложен",
    "block_card": "Карта заблокирована, перевыпуск заказан",
    "logout_all": "Вы вышли со всех устройств, пароль нужно сменить при следующем входе",
}


def _rub(x: float) -> str:
    return f"{x:,.0f} ₽".replace(",", " ")


def draft(persona_id: str, kind: str, branch: str | None) -> str | None:
    """Черновик обращения в банк или заявления в полицию по шаблону ветки (content/sos/report_templates.json)."""
    templates = content.report_templates().get(kind, {})
    template = templates.get(branch or "A") or next(iter(templates.values()), None)
    if not template:
        return None
    account = bank.get(persona_id)
    txs = account.transactions
    inc = next((t for t in reversed(txs) if t.direction == "in" and (t.flagged or t.is_new_counterparty)), None)
    out = next((t for t in reversed(txs) if t.direction == "out" and t.is_new_counterparty), None)
    timeline = "\n".join(
        f"{t.ts:%d.%m %H:%M}  {'+' if t.direction == 'in' else '−'}{_rub(t.amount)}  {t.counterparty}"
        for t in txs[-6:]
    )
    return template.format(
        name=account.persona.name,
        age=account.persona.age,
        date=f"{datetime.now():%d.%m.%Y}",
        incoming=f"{_rub(inc.amount)} от «{inc.counterparty}» {inc.ts:%d.%m в %H:%M}" if inc else "—",
        outgoing=f"{_rub(out.amount)} на «{out.counterparty}» {out.ts:%d.%m в %H:%M}" if out else "—",
        timeline=timeline or "—",
    )


@router.post("/action")
def action(req: SosActionRequest):
    engine.publish_for_persona(req.persona_id)
    result = {"action": req.action, "result": ACTION_RESULTS.get(req.action, "Готово")}
    if req.action in ("report_bank", "report_police"):
        result["draft"] = draft(req.persona_id, req.action, req.branch)
    return result


@router.post("/report", response_model=ReportResponse)
def report(req: ReportRequest):
    """Черновик обращения в банк по ветке (как в /action с report_bank) — для прямого вызова."""
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
