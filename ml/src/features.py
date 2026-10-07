"""Признаки для скоринга перевода в момент попытки. Должны совпадать с бэкендом
(backend/app/services/risk.py) — когда модель готова, бэкенд импортирует/копирует этот модуль.

TODO(Даша): реализовать build_features() и словарь PHRASES для причин в интерфейсе.
"""

FEATURES = [
    "minutes_since_stranger_incoming",   # минут с последнего зачисления от незнакомца
    "forward_share",                     # доля этого зачисления, которую переводят дальше
    "is_new_recipient",                  # получатель новый
    "unique_stranger_senders_24h",
    "unique_stranger_senders_7d",
    "client_age",
    "card_age_days",
    "turnover_spike",                    # оборот за 24ч / медианный дневной оборот за 30д
    "is_night",
    "cash_withdrawal_after_incoming",
]

# Признак → человеческая фраза для экрана перехвата (из SHAP берём топ-3)
PHRASES = {
    "minutes_since_stranger_incoming": "Деньги пришли от незнакомца {value:.0f} мин назад",
    "forward_share": "Ты переводишь {value:.0%} этой суммы дальше",
    "is_new_recipient": "Новый получатель, раньше переводов ему не было",
    "unique_stranger_senders_24h": "{value:.0f} переводов от разных незнакомцев за сутки",
}


def build_features(history, transfer) -> dict:
    raise NotImplementedError
