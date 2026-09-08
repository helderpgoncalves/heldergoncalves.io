# ─────────────────────────────────────────────────────────────────────
# Testes de integração: pedidos a sério contra a aplicação FastAPI, sem
# tocar em nada de fora — o envio de email é sempre simulado.
#
# `client`, `fake_mail`, `token_for` e `sign_in` vivem em conftest.py —
# são precisos noutros ficheiros de teste também.
# ─────────────────────────────────────────────────────────────────────
from conftest import sign_in, token_for

_token = token_for
_sign_in = sign_in


def test_healthz_is_ok(client):
    res = client.get("/healthz")
    assert res.status_code == 200
    assert res.text == "ok"


def test_token_reports_what_is_enabled(client):
    body = client.get("/api/token").json()
    assert body["ok"] is True
    assert body["enabled"] is True  # RESEND_API_KEY está definida nos testes
    assert "token" in body


def test_token_is_rate_limited_per_ip(client):
    from app.config import LIMITS

    for _ in range(LIMITS.token_per_ip):
        assert client.get("/api/token").status_code == 200
    assert client.get("/api/token").status_code == 429


def test_contact_rejects_wrong_origin(client):
    res = client.post(
        "/api/contact",
        json={"from": "a@b.com", "subject": "Oi", "message": "Uma mensagem com mais de dez caracteres."},
        headers={"Origin": "https://outro-site.test"},
    )
    assert res.status_code == 403
    assert res.json()["error"] == "origem"


def test_contact_requires_a_form_token(client):
    res = client.post(
        "/api/contact",
        json={"from": "a@b.com", "subject": "Oi", "message": "Uma mensagem com mais de dez caracteres."},
    )
    assert res.status_code == 400
    assert res.json()["error"] == "token"


def test_contact_ignores_the_honeypot_silently(client, fake_mail):
    token = _token(client)
    res = client.post("/api/contact", json={"company": "sou um robô", "token": token})
    assert res.status_code == 200
    assert res.json()["ok"] is True
    assert fake_mail == []  # nada foi enviado


def test_contact_delivers_a_valid_message(client, fake_mail, monkeypatch):
    from app.config import LIMITS

    monkeypatch.setattr(LIMITS, "token_min_age", 0)
    token = _token(client)
    res = client.post(
        "/api/contact",
        json={"from": "visitante@example.test", "subject": "Olá", "message": "Uma mensagem com mais de dez caracteres.", "token": token},
    )
    assert res.status_code == 200
    assert res.json()["ok"] is True
    assert len(fake_mail) == 1


def test_contact_rejects_an_invalid_email(client, monkeypatch):
    from app.config import LIMITS

    monkeypatch.setattr(LIMITS, "token_min_age", 0)
    token = _token(client)
    res = client.post(
        "/api/contact",
        json={"from": "nao-e-email", "subject": "Olá", "message": "Uma mensagem com mais de dez caracteres.", "token": token},
    )
    assert res.status_code == 400
    assert res.json()["error"] == "email"


def test_subscribe_sends_a_confirmation(client, fake_mail, monkeypatch):
    from app.config import LIMITS

    monkeypatch.setattr(LIMITS, "sub_token_min_age", 0)
    token = _token(client)
    res = client.post("/api/subscribe", json={"email": "novo-subscritor@example.test", "token": token})
    assert res.status_code == 200
    assert res.json()["ok"] is True
    assert len(fake_mail) == 1


def test_subscribe_confirm_rejects_a_bad_link(client):
    res = client.get("/api/subscribe/confirm", params={"e": "x", "t": "1", "s": "y"})
    assert res.status_code == 400
    assert "text/html" in res.headers["content-type"]


def test_static_serves_the_homepage(client):
    res = client.get("/")
    assert res.status_code == 200
    assert "text/html" in res.headers["content-type"]


def test_unknown_api_route_is_a_json_404(client):
    res = client.get("/api/isto-nao-existe")
    assert res.status_code == 404
    assert res.json()["error"] == "rota"


def test_security_headers_are_always_present(client):
    res = client.get("/healthz")
    assert res.headers["x-content-type-options"] == "nosniff"
    assert "Content-Security-Policy" in res.headers


# ── O dono do Calendário ─────────────────────────────────────────────
# OWNER_EMAIL="dono@example.test" — ver conftest.py.


def test_auth_me_reports_owner_for_the_owner(client):
    _sign_in(client, "dono@example.test")
    body = client.get("/api/auth/me").json()
    assert body["owner"] is True


def test_auth_me_reports_not_owner_for_anyone_else(client):
    _sign_in(client, "visitante@example.test")
    body = client.get("/api/auth/me").json()
    assert body["owner"] is False


def test_full_calendar_requires_a_session(client):
    res = client.get("/api/reunioes/todas", params={"from": "2030-01-01", "to": "2030-01-31"})
    assert res.status_code == 401


def test_full_calendar_rejects_a_non_owner_session(client):
    _sign_in(client, "visitante@example.test")
    res = client.get("/api/reunioes/todas", params={"from": "2030-01-01", "to": "2030-01-31"})
    assert res.status_code == 403
    assert res.json()["error"] == "dono"


def test_full_calendar_works_for_the_owner(client):
    _sign_in(client, "dono@example.test")
    res = client.get("/api/reunioes/todas", params={"from": "2030-01-01", "to": "2030-01-31"})
    assert res.status_code == 200
    assert res.json() == {"ok": True, "meetings": []}


def test_only_the_owner_can_create_an_override(client):
    _sign_in(client, "visitante@example.test")
    res = client.post("/api/reunioes/bloqueios", json={"kind": "bloqueio", "start": "2030-01-07T09:00:00Z", "end": "2030-01-07T12:00:00Z"})
    assert res.status_code == 403


def test_the_owner_can_create_and_list_and_remove_an_override(client):
    _sign_in(client, "dono@example.test")
    created = client.post(
        "/api/reunioes/bloqueios",
        json={"kind": "bloqueio", "start": "2030-01-07T09:00:00Z", "end": "2030-01-07T12:00:00Z", "note": "férias"},
    )
    assert created.status_code == 200
    override_id = created.json()["override"]["id"]

    listed = client.get("/api/reunioes/bloqueios").json()["overrides"]
    assert any(o["id"] == override_id for o in listed)

    removed = client.post("/api/reunioes/bloqueios/remover", json={"id": override_id})
    assert removed.status_code == 200
    assert not any(o["id"] == override_id for o in client.get("/api/reunioes/bloqueios").json()["overrides"])


def test_creating_an_override_rejects_a_backwards_interval(client):
    _sign_in(client, "dono@example.test")
    res = client.post(
        "/api/reunioes/bloqueios",
        json={"kind": "bloqueio", "start": "2030-01-07T12:00:00Z", "end": "2030-01-07T09:00:00Z"},
    )
    assert res.status_code == 400
    assert res.json()["error"] == "intervalo"
