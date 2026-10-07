from fastapi import APIRouter, HTTPException

from app import content
from app.schemas import EventRequest, ProgressRequest, ProgressResponse
from app.services.bank import bank

router = APIRouter(prefix="/api", tags=["learning"])

XP_PER_LEVEL = 100


@router.post("/events")
def event(req: EventRequest):
    """Движок триггеров: событие → урок.

    TODO(Даша): условия по payload (пороги трат, счётчик подписок и т. п.).
    """
    for trig in content.lesson_triggers():
        if trig["event"] == req.type:
            return {"lesson": content.lesson(trig["lesson_id"])}
    return {"lesson": None}


@router.get("/lessons")
def lessons():
    """Все уроки в виде сторис, по порядку показа."""
    return content.lessons()


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


ACTION_XP = {"safe_exit": 50}


def _progress(account, gained: int = 0) -> ProgressResponse:
    return ProgressResponse(
        xp=account.xp, level=1 + account.xp // XP_PER_LEVEL, done=sorted(account.done), gained=gained
    )


@router.get("/progress/{persona_id}", response_model=ProgressResponse)
def get_progress(persona_id: str):
    return _progress(bank.get(persona_id))


@router.post("/progress", response_model=ProgressResponse)
def progress(req: ProgressRequest):
    """Начисляет XP один раз за каждый урок, квест или правильное действие."""
    account = bank.get(req.persona_id)
    key, xp = None, 0
    if req.lesson_id:
        key, xp = f"lesson:{req.lesson_id}", content.lesson(req.lesson_id).get("xp", 20)
    elif req.quest_id:
        key, xp = f"quest:{req.quest_id}", content.quest(req.quest_id).get("xp", 50)
    elif req.action:
        key, xp = f"action:{req.action}", ACTION_XP.get(req.action, 0)
    if not key or key in account.done:
        return _progress(account)
    account.done.add(key)
    account.xp += xp
    return _progress(account, gained=xp)
