"""Клиент LLM. Провайдеры: none (только шаблоны), ollama (on-prem), gigachat (TODO).

LLM только ОБЪЯСНЯЕТ решение модели. Если провайдер недоступен или ответ невалиден —
возвращаем None, и вызывающий код использует шаблон.
"""
import json

import httpx

from app.config import settings


def complete_json(system: str, user: str, timeout: float = 20.0) -> dict | None:
    if settings.llm_provider == "ollama":
        try:
            r = httpx.post(
                f"{settings.ollama_url}/api/chat",
                json={
                    "model": settings.ollama_model,
                    "format": "json",
                    "stream": False,
                    "messages": [
                        {"role": "system", "content": system},
                        {"role": "user", "content": user},
                    ],
                },
                timeout=timeout,
            )
            r.raise_for_status()
            return json.loads(r.json()["message"]["content"])
        except (httpx.HTTPError, KeyError, json.JSONDecodeError):
            return None
    if settings.llm_provider == "gigachat":
        # TODO(тимлид): GigaChat API (OAuth по GIGACHAT_CREDENTIALS) — запасной вариант для демо
        return None
    return None
