# ─────────────────────────────────────────────────────────────────────
# O caminho de ponta a ponta: pedir a ligação, e abri-la.
# ─────────────────────────────────────────────────────────────────────
from urllib.parse import parse_qs, urlparse

from conftest import token_for


def _magic_link_from(fake_mail) -> str:
    """`fake_mail` guarda o que foi mandado — a ligação está algures no
    corpo do texto."""
    body = fake_mail[-1]["text"]
    for line in body.splitlines():
        if line.strip().startswith("http"):
            return line.strip()
    raise AssertionError("nenhuma ligação encontrada no email simulado")


def test_start_sends_a_magic_link(client, fake_mail, monkeypatch):
    from app.config import LIMITS

    monkeypatch.setattr(LIMITS, "sub_token_min_age", 0)
    res = client.post("/api/auth/start", json={"email": "visitante@example.test", "token": token_for(client)})
    assert res.status_code == 200
    assert res.json()["ok"] is True
    link = _magic_link_from(fake_mail)
    assert "/api/auth/magic" in link


def test_opening_the_link_signs_in(client, fake_mail, monkeypatch):
    from app.config import LIMITS

    monkeypatch.setattr(LIMITS, "sub_token_min_age", 0)
    client.post("/api/auth/start", json={"email": "visitante@example.test", "token": token_for(client)})
    link = _magic_link_from(fake_mail)
    path_and_query = link.split("/api/auth/magic", 1)[1]

    res = client.get("/api/auth/magic" + path_and_query, follow_redirects=False)
    assert res.status_code == 302
    assert "entrar=ok" in res.headers["location"]
    # o cookie real tem `Secure` (SITE_ORIGIN é https nos testes) — o
    # TestClient não o reenvia sobre http, tal como um browser a sério
    # não reenviaria; ver test_oauth_google.py, que pára aqui pela mesma
    # razão. O que "entrar" faz depois de ter cookie é testado à parte,
    # com `sign_in()` (conftest.py), que injecta o cookie directamente.
    assert "hs=" in res.headers["set-cookie"]


def test_the_link_is_single_use(client, fake_mail, monkeypatch):
    from app.config import LIMITS

    monkeypatch.setattr(LIMITS, "sub_token_min_age", 0)
    client.post("/api/auth/start", json={"email": "visitante@example.test", "token": token_for(client)})
    link = _magic_link_from(fake_mail)
    path_and_query = link.split("/api/auth/magic", 1)[1]

    first = client.get("/api/auth/magic" + path_and_query, follow_redirects=False)
    assert "entrar=ok" in first.headers["location"]

    second = client.get("/api/auth/magic" + path_and_query, follow_redirects=False)
    assert "erro" in second.headers["location"]
    assert "set-cookie" not in second.headers


def test_a_malformed_link_redirects_with_an_error(client):
    res = client.get("/api/auth/magic", params={"e": "x", "t": "não-é-número", "s": "x"}, follow_redirects=False)
    assert res.status_code == 302
    assert "erro" in res.headers["location"]
    assert "set-cookie" not in res.headers


def test_start_is_rate_limited_per_ip(client):
    from app.config import LIMITS

    for _ in range(LIMITS.auth_per_ip):
        res = client.post("/api/auth/start", json={"email": "visitante@example.test", "token": token_for(client)})
        # o token só serve uma vez — o que interessa aqui é o limite por IP, não o token
        if res.status_code == 429:
            break
    else:
        res = client.post("/api/auth/start", json={"email": "visitante@example.test", "token": token_for(client)})
    assert res.status_code == 429


def test_start_requires_a_valid_email(client, monkeypatch):
    from app.config import LIMITS

    monkeypatch.setattr(LIMITS, "sub_token_min_age", 0)
    res = client.post("/api/auth/start", json={"email": "não-é-email", "token": token_for(client)})
    assert res.status_code == 400
    assert res.json()["error"] == "email"


def test_start_ignores_the_honeypot(client, fake_mail):
    res = client.post("/api/auth/start", json={"company": "sou um robô", "email": "x@x.test", "token": token_for(client)})
    assert res.status_code == 200
    assert fake_mail == []
