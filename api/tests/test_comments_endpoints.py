# ─────────────────────────────────────────────────────────────────────
# Comentários e reações, de ponta a ponta.
#
# Comentar e reagir pedem sessão sempre — ver routers/comments.py. O
# nome vem da sessão (a parte local do email, se não vier um no
# formulário); nunca há campo de email a preencher.
# ─────────────────────────────────────────────────────────────────────
from conftest import sign_in, token_for


def _post_comment(client, monkeypatch, **overrides):
    from app.config import LIMITS

    monkeypatch.setattr(LIMITS, "token_min_age", 0)
    sign_in(client, "visitante@example.test")
    payload = {
        "post": "um-escrito",
        "name": "Ana",
        "body": "Gostei muito deste escrito.",
        "token": token_for(client),
        **overrides,
    }
    return client.post("/api/comentarios", json=payload)


def test_listing_requires_a_valid_post_slug(client):
    res = client.get("/api/comentarios", params={"post": "Não Vale/../"})
    assert res.status_code == 400


def test_listing_an_empty_post_returns_empty_lists(client):
    body = client.get("/api/comentarios", params={"post": "um-escrito"}).json()
    assert body == {"ok": True, "comments": [], "reactions": {"gosto": 0, "adorei": 0, "ideia": 0}, "mine": []}


def test_posting_a_comment_requires_a_session(client):
    res = client.post("/api/comentarios", json={"post": "um-escrito", "name": "Ana", "body": "Olá."})
    assert res.status_code == 401
    assert res.json()["error"] == "sessao"


def test_posting_a_comment_requires_a_token(client):
    sign_in(client, "visitante@example.test")
    res = client.post("/api/comentarios", json={"post": "um-escrito", "name": "Ana", "body": "Olá."})
    assert res.status_code == 400
    assert res.json()["error"] == "token"


def test_posting_a_comment_ignores_the_honeypot(client, monkeypatch):
    from app.config import LIMITS

    monkeypatch.setattr(LIMITS, "token_min_age", 0)
    sign_in(client, "visitante@example.test")
    res = client.post("/api/comentarios", json={"company": "sou um robô", "token": token_for(client)})
    assert res.status_code == 200
    assert client.get("/api/comentarios", params={"post": "um-escrito"}).json()["comments"] == []


def test_posting_and_listing_a_comment(client, monkeypatch):
    res = _post_comment(client, monkeypatch)
    assert res.status_code == 200

    listed = client.get("/api/comentarios", params={"post": "um-escrito"}).json()["comments"]
    assert len(listed) == 1
    assert listed[0]["name"] == "Ana"
    assert "email" not in listed[0]


def test_a_signed_in_person_can_comment_without_a_name(client, monkeypatch):
    from app.config import LIMITS

    monkeypatch.setattr(LIMITS, "token_min_age", 0)
    sign_in(client, "visitante@example.test")
    res = client.post(
        "/api/comentarios",
        json={"post": "um-escrito", "name": "", "body": "Um comentário com sessão.", "token": token_for(client)},
    )
    assert res.status_code == 200
    assert res.json()["comment"]["name"] == "visitante"  # a parte local do email, sem nome dado


def test_reacting_requires_a_session(client):
    res = client.post("/api/comentarios/reagir", json={"post": "um-escrito", "kind": "gosto"})
    assert res.status_code == 401


def test_reacting_toggles_and_returns_updated_counts(client):
    sign_in(client, "visitante@example.test")
    on = client.post("/api/comentarios/reagir", json={"post": "um-escrito", "kind": "gosto"})
    assert on.status_code == 200
    assert on.json()["active"] is True
    assert on.json()["reactions"]["gosto"] == 1

    off = client.post("/api/comentarios/reagir", json={"post": "um-escrito", "kind": "gosto"})
    assert off.json()["active"] is False
    assert off.json()["reactions"]["gosto"] == 0


def test_reacting_rejects_an_unknown_kind(client):
    sign_in(client, "visitante@example.test")
    res = client.post("/api/comentarios/reagir", json={"post": "um-escrito", "kind": "nao-existe"})
    assert res.status_code == 400


def test_only_the_owner_can_remove_a_comment(client, monkeypatch):
    created = _post_comment(client, monkeypatch).json()["comment"]
    # _post_comment já deixa client com sessão de "visitante@example.test"
    res = client.post("/api/comentarios/remover", json={"id": created["id"]})
    assert res.status_code == 403  # tem sessão, mas não é o dono


def test_the_owner_can_remove_a_comment(client, monkeypatch):
    created = _post_comment(client, monkeypatch).json()["comment"]
    sign_in(client, "dono@example.test")
    res = client.post("/api/comentarios/remover", json={"id": created["id"]})
    assert res.status_code == 200
    assert client.get("/api/comentarios", params={"post": "um-escrito"}).json()["comments"] == []
