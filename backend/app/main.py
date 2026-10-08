import threading

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import assistant, demo, learning, payments, shield, sos

app = FastAPI(title="nexus · Старт", version="0.1.0", description="Контракты: docs/api.md")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)

for module in (demo, payments, sos, shield, learning, assistant):
    app.include_router(module.router)


@app.on_event("startup")
def warm_up_ocr():
    """Модель распознавания скриншотов грузится ~20 с — делаем это в фоне при старте, а не на первом запросе."""
    from app.services import shield

    def load():
        try:
            shield._ocr_reader()
        except shield.OcrUnavailable:
            pass

    threading.Thread(target=load, daemon=True).start()


@app.get("/api/health")
def health():
    return {"status": "ok"}
