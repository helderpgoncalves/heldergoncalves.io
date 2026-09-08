# ─────────────────────────────────────────────────────────────────────
# A caixa de entrada das Mensagens — só o dono a lê.
# ─────────────────────────────────────────────────────────────────────
from conftest import sign_in


def test_inbox_requires_a_session(client):
    assert client.get("/api/mensagens").status_code == 401


def test_inbox_rejects_a_non_owner_session(client):
    sign_in(client, "visitante@example.test")
    res = client.get("/api/mensagens")
    assert res.status_code == 403
    assert res.json()["error"] == "dono"


async def test_the_owner_sees_a_recorded_conversation(client):
    from app.chat_store import conversation_id, record_turn

    conv = conversation_id("visitante@example.test", "fp")
    await record_turn(conv, "visitante@example.test", "user", "Olá", "pt")
    await record_turn(conv, "visitante@example.test", "assistant", "Olá! Em que posso ajudar?", "pt")

    sign_in(client, "dono@example.test")
    listed = client.get("/api/mensagens").json()["conversations"]
    assert any(c["conversation"] == conv and c["turns"] == 2 for c in listed)

    thread = client.get(f"/api/mensagens/{conv}").json()
    assert thread["ok"] is True
    assert [t["role"] for t in thread["turns"]] == ["user", "assistant"]


def test_an_unknown_conversation_is_a_404(client):
    sign_in(client, "dono@example.test")
    res = client.get("/api/mensagens/nao-existe")
    assert res.status_code == 404
