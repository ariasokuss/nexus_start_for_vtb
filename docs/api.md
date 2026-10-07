# Контракты API

Код-версия — `backend/app/schemas.py` (Pydantic) и `frontend/src/api/types.ts`. Меняем **все три места вместе** в одном PR.
Живая документация после запуска: http://localhost:8000/docs

## Демо-движок

| Метод | Путь | Что делает |
|---|---|---|
| GET | `/api/demo/scenarios` | Список сценариев `[{id, persona, title, steps_count}]` |
| GET | `/api/demo/{id}` | Текущее состояние `DemoState` |
| POST | `/api/demo/{id}/reset` | Сброс сценария и банка персонажа → `DemoState` |
| POST | `/api/demo/{id}/next` | Следующий шаг (применяет `chat` и `bank_events` шага) → `DemoState` |
| GET | `/api/demo/{id}/stream` | SSE: `DemoState` после каждого шага, перевода, действия в SOS |

```jsonc
// DemoState
{
  "scenario_id": "artem",
  "persona": { "id": "artem", "name": "Артём", "age": 16, "balance": 31200, "description": "..." },
  "step_index": 1, "steps_count": 5,
  "step": { "id": "incoming", "title": "Деньги пришли", "hint": "...", "chat": [...], "bank_events": [...], "expect": null },
  "chat_history": [{ "sender": "recruiter", "text": "..." }],
  "risk": { "persona_id": "artem", "score": 0.55, "level": "medium", "signals": ["Зачисление 30 000 ₽ от незнакомого отправителя"] }
}
```

### Формат сценария `content/scenarios/<id>.json`
```jsonc
{
  "persona_id": "artem",                       // из content/personas.json
  "title": "…",
  "steps": [{
    "id": "incoming", "title": "Деньги пришли", "hint": "подсказка для жюри",
    "chat": [{ "sender": "recruiter | user | system", "text": "…" }],
    "bank_events": [{ "type": "incoming | outgoing", "amount": 30000, "counterparty": "Иван К.", "is_new_counterparty": true }],
    "expect": { "action": "transfer", "to": "+79990001234", "amount": 27000 }   // или {"action":"sos","branch":"A"} / {"action":"event","type":"salary"}
  }]
}
```

## Фейковый банк и скоринг

| Метод | Путь | Что делает |
|---|---|---|
| GET | `/api/personas` | Персонажи с текущим балансом |
| GET | `/api/personas/{id}/transactions` | История операций |
| POST | `/api/payments/transfer` | Попытка перевода → скоринг → `ok` или `intercepted` |
| GET | `/api/risk/{persona_id}/live` | Риск «прямо сейчас» для правой панели |

```jsonc
// POST /api/payments/transfer
{ "persona_id": "artem", "to": "+79990001234", "amount": 27000 }
// →
{
  "status": "intercepted",
  "risk": { "score": 0.9, "level": "high",
            "reasons": ["30 000 ₽ пришли от незнакомца 1 мин назад", "Ты переводишь 90% этой суммы дальше", "Новый получатель…", "Клиенту 16 лет"] },
  "intercept": { "title": "Стоп, подожди", "text": "…", "consequences": ["…"],
                 "actions": ["cancel", "offered_job", "check_message", "continue"] },
  "balance": 31200
}
```
Перехват — при `level == "high"` (score ≥ 0.7). Если исходящие на паузе — `423`.

## Безопасный выход (SOS)

| Метод | Путь | Тело → ответ |
|---|---|---|
| GET | `/api/sos/branches` | Ветки A–D из `content/sos/branches.json` |
| GET | `/api/sos/legal` | Юр. формулировки из `content/legal.json` |
| POST | `/api/sos/return-funds` | `{persona_id, operation_id}` → `{claim_id, frozen_amount, status: "frozen" \| "not_found"}` |
| POST | `/api/sos/evidence` | `{persona_id, images_base64[]}` → `{evidence_id, count}` |
| POST | `/api/sos/pause-outgoing` | `{persona_id}` → `{paused_until}` |
| POST | `/api/sos/report` | `{persona_id, branch}` → `{draft_text, attachments[]}` |

## Щит

```jsonc
// POST /api/shield/check
{ "text": "Подработка без опыта! Прими перевод и переведи дальше, 10% твои", "image_base64": null }
// →
{ "risk": "high", "score": 0.95, "scheme": "drop_recruitment",
  "red_flags": ["Просят принять перевод на твою карту", "..."],
  "explanation": "…", "consequences": ["…"], "advice": ["…"],
  "source": "classifier+template" }   // или "classifier+llm"
```
`scheme`: `drop_recruitment` · `phishing` · `relative_in_trouble` · `prize` · `other_fraud` (мошенничество другого типа) · `safe`.

## Уроки, квест, прогресс

| Метод | Путь | Тело → ответ |
|---|---|---|
| POST | `/api/events` | `{persona_id, type, payload}` → `{lesson \| null}`; типы: `p2p_stranger, salary, subscription, overspend, bank_call` |

Условия урока — поле `when` в `content/lessons/triggers.json`. Поля `payload`: `p2p_stranger` → `amount` (≥ 1000), `salary` → `is_first` (true), `subscription` → `active_subscriptions` (≥ 3), `overspend` → `overspend_ratio` (≥ 1.3). Если поля нет в `payload`, условие не проверяется и урок показывается.
| GET | `/api/lessons/{id}` | Урок: `{id, title, xp, cards[], quiz}` |
| GET | `/api/quest/{id}` | Граф квеста: `{start, nodes[{id, speaker, text, choices[{text, next}], ending?}]}` |
| POST | `/api/progress` | `{persona_id, lesson_id \| quest_id}` → `{xp, level}` |
