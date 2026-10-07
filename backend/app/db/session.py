"""Подключение к PostgreSQL.

Пока состояние демо живёт в памяти (services/bank.py).
TODO(тимлид): модели в db/models.py и перенос состояния, когда понадобится.
"""
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.config import settings

engine = create_engine(settings.database_url, pool_pre_ping=True)
SessionLocal = sessionmaker(bind=engine, autoflush=False)
