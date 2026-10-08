"""Щит: проверка подозрительного сообщения.

Пайплайн: (скриншот → OCR) → классификатор ставит вердикт → LLM объясняет → фолбэк на шаблон.
Вердикт — классификатор из ml/ (TF-IDF + логрег, app/ml/shield_model.py) плюс баллы за группы признаков
схемы (classify); если файла модели нет — только признаки. Регулярки дают человеческие red_flags и подтип схемы.
TODO(тимлид): OCR через EasyOCR для image_base64.
"""
import re

from app import content
from app.ml import shield_model
from app.schemas import ShieldResponse
from app.services import llm

# Признаки схемы дропа, сгруппированные по смыслу. Одна группа — слабый сигнал,
# сочетание «вам пришлют» + «перешлите дальше» — классическая схема.
DROP_SIGNALS = {
    "receive": (
        r"прими(те)? перевод|принять перевод|принимать перевод|прид[её]т (перевод|деньги|сумма)"
        r"|(кину|скину|отправлю|переведу|закину) (тебе |вам )?(денег|деньги|бабк|бабл|сумму|\d)|дам (тебе |вам )?(денег|деньги)"
        r"|на лапу|на твою карту|на вашу карту",
        "Обещают прислать деньги на вашу карту",
    ),
    "forward": (
        r"(переведи|переведите|отправь|отправьте|скинь|скиньте) (их |эти деньги |все )?(дальше|кому|на (номер|карту|эту|другую|указанн))"
        r"|перешли|пересла|перевести дальше|кому (надо|скажу|скажут)|по (этому |моему )?номеру|на другую карту|обратно на",
        "Просят переслать деньги дальше",
    ),
    "cut": (
        r"\d+\s?%|процент|оставь себе|оставишь себе|оставишь|\d+\s?к (твои|тебе|себе)|твои\b|заплачу \d|\d+\s?к за",
        "Обещают вознаграждение за перевод",
    ),
    "card": (
        r"(сдать|продать|оформить|одолжи|дай|нужна) (мне )?(твою |твоя |свою |вашу |ваша )?карт|данные карты|номер карты и|cvc|cvv"
        r"|доступ к (приложению|банку|личному)|логин|пароль от",
        "Просят карту, её данные или доступ к банку",
    ),
    "job": (
        r"без опыта|л[её]гк(ий|ие|ая|ого) (заработ|деньг)|подработк|работа с переводами|есть тема|на пару дней|быстрые деньги",
        "«Подработка» с лёгкими деньгами",
    ),
}
RUSH = (r"срочно|быстро|только быстро|прямо сейчас|пока не|до вечера|в течение часа", "Вас торопят")

OTHER_FRAUD_PATTERNS = {
    r"служб[аы] безопасности|безопасный сч[её]т|код из (смс|сообщения)|назови(те)? код|сообщи(те)? код"
    r"|карт[ау] (заблокир|взломал)|подозрительн(ая|ую) операци": ("phishing", "Представляются банком и просят код или перевод"),
    r"(мам|пап|бабушк|дедушк|сестр|брат)\w*[^.!?]{0,40}(бед[аеу]|дтп|полиц|больниц|срочно)|попал[аи]? в (беду|дтп|больниц|полици)"
    r"|срочно нужны деньги|это мой новый номер": ("relative_in_trouble", "Срочная просьба денег от «родственника»"),
    r"выиграл|ваш приз|розыгрыш|бесплатн(ый|о|ые) (айфон|подарок|приз)|получите приз": ("prize", "Сообщают о выигрыше или подарке"),
}
LINK = r"https?://|www\.|bit\.ly|\b\w+\.(ru|com|net|xyz|top|site|io)\b"

SYSTEM_PROMPT = (
    "Ты помогаешь подростку понять, почему сообщение опасно. Пиши просто, обращайся на «вы», без эмодзи и без запугивания. "
    "Не придумывай статьи законов, суммы и номера телефонов. "
    'Верни JSON: {"explanation": "2-3 предложения", "advice": ["...", "..."]}'
)


def _norm(text: str) -> str:
    low = text.lower().replace("ё", "е")
    return re.sub(r"(.){2,}", r"", low)  # «даааааа» → «даа», чтобы растянутые слова не мешали


def classify(text: str) -> tuple[str, float, list[str]]:
    """Вердикт = вероятность модели + признаки схемы.

    Модель (TF-IDF + логрег) хорошо ловит типичные формулировки, но на «живой» речи с мусором
    бывает не уверена. Поэтому сверху добавляем баллы за группы признаков: по отдельности они слабые,
    а вместе («пришлю деньги» + «перешли дальше») — однозначная схема дропа.
    """
    if not text.strip():
        return "safe", 0.0, []
    low = _norm(text)
    groups = {name: msg for name, (pattern, msg) in DROP_SIGNALS.items() if re.search(pattern, low)}
    rush = re.search(RUSH[0], low) is not None
    other = [(scheme, msg) for pattern, (scheme, msg) in OTHER_FRAUD_PATTERNS.items() if re.search(pattern, low)]
    link = re.search(LINK, low) is not None

    if shield_model.available():
        proba = shield_model.predict_proba(text)
    else:  # без модели — нейтральная точка отсчёта, решают признаки
        proba = {"drop_recruitment": 0.1, "other_fraud": 0.1, "safe": 0.8}

    drop = proba["drop_recruitment"] + 0.18 * len(groups)
    if "receive" in groups and ("forward" in groups or "cut" in groups):
        drop += 0.2  # классическая схема: пришлют → перешли / оставь процент
    if "card" in groups:
        drop += 0.15  # просьба карты или доступа опасна сама по себе
    fraud = proba["other_fraud"] + 0.3 * len(other) + (0.1 if link else 0)
    if rush and (groups or other):
        drop, fraud = drop + 0.05 * bool(groups), fraud + 0.05 * bool(other)
    drop, fraud = min(drop, 0.99), min(fraud, 0.99)

    # Без единого признака схемы полагаемся только на модель — и требуем от неё уверенности
    if not groups and not other and not link and max(drop, fraud) < 0.6:
        return "safe", round(max(drop, fraud), 2), []
    if max(drop, fraud) < 0.4:
        return "safe", round(max(drop, fraud), 2), []  # признаки не показываем: вердикт «безопасно»

    if drop >= fraud:
        flags = list(groups.values()) or ["Похоже на типичные сообщения вербовщиков"]
        if rush:
            flags.append(RUSH[1])
        return "drop_recruitment", drop, flags

    scheme, msg = other[0] if other else ("other_fraud", "Похоже на типичную мошенническую схему")
    flags = [m for _, m in other] or [msg]
    if link:
        flags.append("В сообщении есть ссылка")
    if rush:
        flags.append(RUSH[1])
    return scheme, fraud, flags


def _template(scheme: str, risk: str = "high") -> tuple[str, list[str]]:
    if scheme == "drop_recruitment" and risk == "medium":
        return (
            "Есть признаки вербовки в дропы, но не все. Если вам предлагают принять деньги на карту и переслать их "
            "дальше — это схема, даже если звучит как подработка или просьба знакомого.",
            ["Не принимайте и не пересылайте чужие деньги", "Уточните, кто пишет, по другому каналу", "Если деньги уже пришли — откройте «Безопасный выход»"],
        )
    if scheme == "drop_recruitment":
        return (
            "Похоже на вербовку в дропы: через вашу карту хотят провести чужие, скорее всего украденные деньги. "
            "Это не подработка — отвечать за операции будете вы.",
            ["Не отвечайте и не передавайте данные карты", "Заблокируйте отправителя", "Если деньги уже пришли — откройте «Безопасный выход»"],
        )
    if scheme == "safe":
        return ("Явных признаков мошенничества не нашли. Но если вас торопят или просят деньги — остановитесь и проверьте.", [])
    if scheme == "relative_in_trouble":
        return (
            "Похоже на схему «родственник в беде»: мошенники пишут с нового номера и просят срочно перевести деньги.",
            ["Позвоните родственнику по старому номеру", "Задайте вопрос, ответ на который знает только он", "Не переводите, пока не убедитесь"],
        )
    if scheme == "phishing":
        return (
            "Похоже на мошенников, которые представляются банком. Настоящий банк не просит коды из СМС и не переводит деньги на «безопасный счёт».",
            ["Положите трубку или не отвечайте", "Не называйте коды и данные карты", "Позвоните в банк по номеру на обороте карты"],
        )
    return (
        "Похоже на мошенничество: вас пытаются заставить действовать быстро и без проверки.",
        ["Не переходите по ссылкам и не называйте коды", "Позвоните в банк по номеру на карте"],
    )


def check(text: str | None, image_base64: str | None) -> ShieldResponse:
    if not text and image_base64:
        text = ""  # TODO(тимлид): OCR
    text = text or ""
    scheme, score, flags = classify(text)
    if scheme == "safe":
        risk = "low"  # вердикт «безопасно» не может идти с повышенным риском
    else:
        risk = "high" if score >= 0.7 else "medium" if score >= 0.4 else "low"

    explanation, advice = _template(scheme, risk)
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
