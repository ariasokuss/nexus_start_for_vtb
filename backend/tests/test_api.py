from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_health():
    assert client.get("/api/health").json() == {"status": "ok"}


def test_artem_transfer_is_intercepted():
    client.post("/api/demo/artem/reset")
    client.post("/api/demo/artem/next")  # деньги пришли
    r = client.post("/api/payments/transfer", json={"persona_id": "artem", "to": "+79990001234", "amount": 27000})
    body = r.json()
    assert body["status"] == "intercepted"
    assert body["risk"]["level"] == "high"
    assert body["intercept"]["consequences"]


def test_normal_transfer_passes():
    client.post("/api/demo/katya/reset")
    r = client.post("/api/payments/transfer", json={"persona_id": "katya", "to": "Онлайн-кинотеатр", "amount": 299})
    assert r.json()["status"] == "ok"


def test_return_funds_freezes_incoming():
    client.post("/api/demo/artem/reset")
    client.post("/api/demo/artem/next")
    txs = client.get("/api/personas/artem/transactions").json()
    incoming = next(t for t in txs if t["direction"] == "in" and t["is_new_counterparty"])
    r = client.post("/api/sos/return-funds", json={"persona_id": "artem", "operation_id": incoming["id"]})
    assert r.json()["status"] == "frozen"
    assert r.json()["frozen_amount"] == 30000


def test_shield_detects_drop_recruitment():
    text = "Подработка без опыта! Прими перевод и переведи дальше, 10% оставь себе"
    body = client.post("/api/shield/check", json={"text": text}).json()
    assert body["scheme"] == "drop_recruitment"
    assert body["risk"] == "high"


def test_all_scenarios_walk_through():
    for s in client.get("/api/demo/scenarios").json():
        state = client.post(f"/api/demo/{s['id']}/reset").json()
        for _ in range(s["steps_count"]):
            state = client.post(f"/api/demo/{s['id']}/next").json()
        assert state["step_index"] == s["steps_count"] - 1


def test_every_trigger_has_lesson():
    for event in ["p2p_stranger", "salary", "subscription", "overspend", "bank_call"]:
        lesson = client.post("/api/events", json={"persona_id": "katya", "type": event}).json()["lesson"]
        assert lesson and lesson["cards"]
