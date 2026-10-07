"""Щит: проверка подозрительного сообщения.

Пайплайн: (скриншот → OCR) → классификатор ставит вердикт → LLM объясняет → фолбэк на шаблон.
Сейчас классификатор — ключевые слова (бейзлайн).
TODO(Даша): заменить classify() на модель из ml/ (TF-IDF/rubert-tiny2 + логрег).
TODO(тимлид): OCR через EasyOCR для image_base64.
"""
import re

from app import content
from app.schemas import ShieldResponse
from app.services import llm

DROP_PATTERNS = {
    r"принять перевод|принимать перевод|прими(те)? перевод": "Просят принять перевод на вашу карту",
    r"переведи|перевести дальше|отправь на (эту|другую) карту": "Просят переслать деньги дальше",
    r"\d+\s?%|процент|оставь себе|твои\b": "Обещают процент за перевод",
    r"(сдать|продать|оформить) карт|данные карты|доступ к (приложению|банку)": "Просят карту или доступ к банку",
    r"без опыта|лёгк(ий|ая) заработок|подработк": "«Подработка без опыта» с быстрыми деньгами",
}
OTHER_FRAUD_PATTERNS = {
    r"служб[аы] безопасности|безопасный счёт|безопасный счет": ("phishing", "Представляются службой безопасности банка"),
    r"мам[аы]?,? (я )?в беде|попал в дтп|срочно нужны деньги": ("relative_in_trouble", "Срочная просьба денег от «родственника»"),
    r"вы выиграли|ваш приз|розыгрыш": ("prize", "Сообщают о выигрыше"),
}

SYSTEM_PROMPT = (
    "Ты помогаешь подростку понять, почему сообщение опасно. Пиши просто, обращайся на «вы», без эмодзи и без запугивания. "
    "Не придумывай статьи законов, суммы и номера телефонов. "
    'Верни JSON: {"explanation": "2-3 предложения", "advice": ["...", "..."]}'
)


def classify(text: str) -> tuple[str, float, list[str]]:
    low = text.lower()
    flags = [msg for pattern, msg in DROP_PATTERNS.items() if re.search(pattern, low)]
    if len(flags) >= 2:
        return "drop_recruitment", min(0.5 + 0.15 * len(flags), 0.99), flags
    for pattern, (scheme, msg) in OTHER_FRAUD_PATTERNS.items():
        if re.search(pattern, low):
            return scheme, 0.8, [msg]
    return "safe", 0.1, flags


def _template(scheme: str) -> tuple[str, list[str]]:
    if scheme == "drop_recruitment":
        return (
            "Похоже на вербовку в дропы: через вашу карту хотят провести чужие, скорее всего украденные деньги. "
            "Это не подработка — отвечать за операции будете вы.",
            ["Не отвечайте и не передавайте данные карты", "Заблокируйте отправителя", "Если деньги уже пришли — откройте «Безопасный выход»"],
        )
    if scheme == "safe":
        return ("Явных признаков мошенничества не нашли. Но если вас торопят или просят деньги — остановитесь и проверьте.", [])
    return (
        "Похоже на мошенничество: вас пытаются заставить действовать быстро и без проверки.",
        ["Не переходите по ссылкам и не называйте коды", "Позвоните в банк по номеру на карте"],
    )


def check(text: str | None, image_base64: str | None) -> ShieldResponse:
    if not text and image_base64:
        text = ""  # TODO(тимлид): OCR
    text = text or ""
    scheme, score, flags = classify(text)
    risk = "high" if score >= 0.7 else "medium" if score >= 0.4 else "low"

    explanation, advice = _template(scheme)
    source = "classifier+template"
    if scheme != "safe":
        answer = llm.complete_json(SYSTEM_PROMPT, f"Сообщение: {text}\nТип схемы: {scheme}\nПризнаки: {flags}")
        if answer and isinstance(answer.get("explanation"), str) and isinstance(answer.get("advice"), list):
            explanation, advice, source = answer["explanation"], [str(a) for a in answer["advice"]], "classifier+llm"

    legal = content.legal()
    consequences = [legal[k]["short"] for k in ("card_block", "cbr_base", "uk187") if k in legal] if scheme == "drop_recruitment" else []
    return ShieldResponse(
        risk=risk, score=round(score, 2), scheme=scheme, red_flags=flags,
        explanation=explanation, consequences=consequences, advice=advice, source=source,
    )
