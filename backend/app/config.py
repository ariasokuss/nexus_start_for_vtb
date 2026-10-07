from pathlib import Path

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str = "postgresql+psycopg://nexus:nexus@localhost:5432/nexus"
    content_dir: Path = Path(__file__).resolve().parents[2] / "content"
    llm_provider: str = "none"  # none | ollama | gigachat
    ollama_url: str = "http://localhost:11434"
    ollama_model: str = "qwen2.5:7b-instruct"
    gigachat_credentials: str = ""


settings = Settings()
