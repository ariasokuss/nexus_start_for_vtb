# ML

| Модель | Задача | Владелец |
|---|---|---|
| Скоринг перевода | Правила + CatBoost: перехватывать ли перевод, причины из SHAP | Даша |
| Классификатор сообщений | `drop_recruitment` / `other_fraud` / `safe` для Щита | Даша |

Бейзлайны уже работают в бэкенде (`backend/app/services/risk.py`, `shield.py`) —
модели из этой папки должны их **побеждать по метрикам** и затем заменить.

## Порядок работы

```bash
python -m venv .venv && .venv/Scripts/activate   # Windows
pip install -r requirements.txt
python src/gen_transactions.py --clients 3000 --days 60 --out data/transactions.parquet
python src/gen_messages.py --out data/messages.csv
python src/train_risk.py
python src/train_shield.py
python src/eval.py           # → reports/metrics.md
```

## Правила
- Только синтетика. Никаких реальных переписок, имён, номеров.
- Тест классификатора — `data/messages_test_manual.csv`: 150 примеров, написанных командой **вручную, без LLM**. Его не используем в обучении.
- Для скоринга обязательно считаем долю ложных перехватов у «нормальных» подростков.
- В отчёте честно пишем, что данные синтетические, и как модель дообучится на данных банка.
