from fastapi import APIRouter, HTTPException

from app import content
from app.schemas import EventRequest, ProgressRequest, ProgressResponse
from app.services.bank import bank

router = APIRouter(prefix="/api", tags=["learning"])

XP_PER_LEVEL = 100


_OPS = {
    "==": lambda a, b: a == b,
    ">=": lambda a, b: a >= b,
    ">": lambda a, b: a > b,
    "<=": lambda a, b: a <= b,
    "<": lambda a, b: a < b,
}


def _matches(trigger: dict, payload: dict) -> bool:
    """Условия из triggers.json ("when"). Поля, которых нет в payload, не проверяем:
    фронт может прислать событие без деталей — тогда урок показываем."""
    for cond in trigger.get("when", []):
        if cond["field"] in payload and not _OPS[cond["op"]](payload[cond["field"]], cond["value"]):
            return False
    return True


@router.post("/events")
def event(req: EventRequest):
    """Движок триггеров: событие + условия по payload → урок.

    Примеры payload: {"amount": 30000} для p2p_stranger, {"is_first": true} для salary,
    {"active_subscriptions": 3} для subscription, {"overspend_ratio": 1.4} для overspend.
    """
    for trig in content.lesson_triggers():
        if trig["event"] == req.type and _matches(trig, req.payload):
            return {"lesson": content.lesson(trig["lesson_id"])}
    return {"lesson": None}


@router.get("/lessons/{lesson_id}")
def lesson(lesson_id: str):
    try:
        return content.lesson(lesson_id)
    except FileNotFoundError:
        raise HTTPException(404, "Нет такого урока")


@router.get("/quest/{quest_id}")
def quest(quest_id: str):
    try:
        return content.quest(quest_id)
    except FileNotFoundError:
        raise HTTPException(404, "Нет такого квеста")


@router.post("/progress", response_model=ProgressResponse)
def progress(req: ProgressRequest):
    account = bank.get(req.persona_id)
    xp = 0
    if req.lesson_id:
        xp = content.lesson(req.lesson_id).get("xp", 20)
    elif req.quest_id:
        xp = content.quest(req.quest_id).get("xp", 50)
    account.xp += xp
    return ProgressResponse(xp=account.xp, level=1 + account.xp // XP_PER_LEVEL)
