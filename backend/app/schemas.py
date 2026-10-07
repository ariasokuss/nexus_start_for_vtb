"""Pydantic-схемы. Это код-версия контрактов из docs/api.md — меняем вместе."""
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field

RiskLevel = Literal["high", "medium", "low"]


# ---------- Банк ----------
class Transaction(BaseModel):
    id: str
    ts: datetime
    amount: float
    direction: Literal["in", "out"]
    counterparty: str
    is_new_counterparty: bool
    channel: Literal["sbp", "card", "cash", "salary"] = "sbp"
    category: str | None = None
    frozen: bool = False
    flagged: bool = False  # зачисление показалось алгоритму подозрительным (этап 1)


class Persona(BaseModel):
    id: str
    name: str
    age: int
    balance: float
    description: str = ""


class TransferRequest(BaseModel):
    persona_id: str
    to: str
    amount: float = Field(gt=0)
    confirmed: bool = False  # «Это мои деньги» после перехвата — второе подтверждение


class TopUpRequest(BaseModel):
    persona_id: str
    sender: str  # «Мама», «Папа» или «Неизвестный»
    amount: float = Field(gt=0)


class PaymentRequest(BaseModel):
    persona_id: str
    merchant: str
    category: str
    amount: float = Field(gt=0)


class Profile(BaseModel):
    """Обычное поведение клиента — с ним алгоритм сравнивает каждую операцию."""
    avg_topup: float
    avg_spend: float
    known_senders: list[str]
    known_recipients: list[str]
    min_transit_minutes: int | None  # самый быстрый «пришло от незнакомца → ушло дальше»


class Risk(BaseModel):
    score: float
    level: RiskLevel
    reasons: list[str]


class Intercept(BaseModel):
    title: str
    text: str
    consequences: list[str]
    actions: list[Literal["cancel", "offered_job", "check_message", "continue"]]


class TransferResponse(BaseModel):
    status: Literal["ok", "intercepted"]
    risk: Risk
    intercept: Intercept | None = None
    balance: float


class OperationResponse(BaseModel):
    status: Literal["ok", "flagged", "rejected"]
    transaction: Transaction | None = None
    risk: Risk
    message: str = ""
    balance: float


class LiveRisk(BaseModel):
    persona_id: str
    score: float
    level: RiskLevel
    signals: list[str]
    profile: Profile | None = None


class AssistantRequest(BaseModel):
    persona_id: str
    message: str
    history: list[dict] = []


class AssistantResponse(BaseModel):
    reply: str
    suggestions: list[str] = []
    action: str | None = None  # подсказка фронту: open_sos, open_shield, open_topup …
    source: Literal["rules", "llm"] = "rules"


# ---------- Демо ----------
class ChatMessage(BaseModel):
    sender: Literal["recruiter", "user", "system"]
    text: str


class BankEvent(BaseModel):
    type: Literal["incoming", "outgoing", "push"]
    amount: float | None = None
    counterparty: str | None = None
    is_new_counterparty: bool = True
    text: str | None = None


class DemoStep(BaseModel):
    id: str
    title: str
    hint: str = ""
    chat: list[ChatMessage] = []
    bank_events: list[BankEvent] = []
    expect: dict | None = None  # что жюри должно сделать на шаге, напр. {"action": "transfer", ...}


class DemoState(BaseModel):
    scenario_id: str
    persona: Persona
    step_index: int
    steps_count: int
    step: DemoStep
    chat_history: list[ChatMessage]
    risk: LiveRisk


class ScenarioInfo(BaseModel):
    id: str
    persona: str
    title: str
    steps_count: int


# ---------- Безопасный выход ----------
class ReturnFundsRequest(BaseModel):
    persona_id: str
    operation_id: str


class ReturnFundsResponse(BaseModel):
    claim_id: str
    frozen_amount: float
    status: Literal["frozen", "not_found"]


class EvidenceRequest(BaseModel):
    persona_id: str
    images_base64: list[str]


class ReportRequest(BaseModel):
    persona_id: str
    branch: Literal["A", "B", "C", "D"]


class ReportResponse(BaseModel):
    draft_text: str
    attachments: list[str]


class SosActionRequest(BaseModel):
    persona_id: str
    action: str


class PersonaRequest(BaseModel):
    persona_id: str


# ---------- Щит ----------
class ShieldRequest(BaseModel):
    text: str | None = None
    image_base64: str | None = None


class ShieldResponse(BaseModel):
    risk: RiskLevel
    score: float
    scheme: Literal["drop_recruitment", "phishing", "relative_in_trouble", "prize", "safe"]
    red_flags: list[str]
    explanation: str
    consequences: list[str]
    advice: list[str]
    source: Literal["classifier+llm", "classifier+template"]


# ---------- Уроки / прогресс ----------
class EventRequest(BaseModel):
    persona_id: str
    type: str
    payload: dict = {}


class ProgressRequest(BaseModel):
    persona_id: str
    lesson_id: str | None = None
    quest_id: str | None = None
    action: str | None = None  # правильное действие вне уроков, напр. "safe_exit"
    result: str = "done"


class ProgressResponse(BaseModel):
    xp: int
    level: int
    done: list[str] = []
    gained: int = 0
