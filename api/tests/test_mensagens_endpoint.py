# ─────────────────────────────────────────────────────────────────────
# GET /api/mensagens e /api/mensagens/{conversa} — só o dono.
# ─────────────────────────────────────────────────────────────────────
from conftest import sign_in

from app.chat_store import conversation_id, record_turn


def test_requires_a_session(client):
    res = client.get("/api/mensagens")
    assert res.status_code == 401


def test_rejects_a_non_owner_session(client):
    sign_in(client, "visitante@example.test")
    res = client.get("/api/mensagens")
    assert res.status_code == 403


def test_the_owner_sees_no_conversations_when_there_are_none(client):
    sign_in(client, "dono@example.test")
    res = client.get("/api/mensagens")
    assert res.status_code == 200
    assert res.json() == {"ok": True, "conversations": []}


async def test_the_owner_sees_a_conversation_that_happened(client):
    conv = conversation_id("visitante@example.test", "fp")
    await record_turn(conv, "visitante@example.test", "user", "olá", "pt")
    await record_turn(conv, "visitante@example.test", "assistant", "olá também", "pt")

    sign_in(client, "dono@example.test")
    conversations = client.get("/api/mensagens").json()["conversations"]
    assert len(conversations) == 1
    assert conversations[0]["conversation"] == conv
    assert conversations[0]["turns"] == 2


def test_conversation_transcript_requires_a_session(client):
    res = client.get("/api/mensagens/qualquer")
    assert res.status_code == 401


def test_conversation_transcript_rejects_a_non_owner_session(client):
    sign_in(client, "visitante@example.test")
    res = client.get("/api/mensagens/qualquer")
    assert res.status_code == 403


def test_unknown_conversation_is_404_for_the_owner(client):
    sign_in(client, "dono@example.test")
    res = client.get("/api/mensagens/inexistente")
    assert res.status_code == 404


async def test_the_owner_reads_a_conversation_transcript(client):
    conv = conversation_id("visitante@example.test", "fp")
    await record_turn(conv, "visitante@example.test", "user", "olá", "pt")
    await record_turn(conv, "visitante@example.test", "assistant", "olá também", "pt")

    sign_in(client, "dono@example.test")
    turns = client.get(f"/api/mensagens/{conv}").json()["turns"]
    assert turns == [
        {"role": "user", "text": "olá", "at": turns[0]["at"]},
        {"role": "assistant", "text": "olá também", "at": turns[1]["at"]},
    ]
