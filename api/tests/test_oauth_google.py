# ─────────────────────────────────────────────────────────────────────
# O caminho de entrar com a Google — sem nunca lhe falar a sério: as
# duas chamadas HTTPS que o `oauth_google.py` faz (trocar o código,
# pedir o perfil) são simuladas aqui.
# ─────────────────────────────────────────────────────────────────────
from urllib.parse import parse_qs, urlparse

from conftest import sign_in, token_for  # noqa: F401  (mantém o linter feliz sobre o uso indirecto)


class _FakeResponse:
    def __init__(self, status_code: int, payload: dict):
        self.status_code = status_code
        self._payload = payload

    def json(self) -> dict:
        return self._payload


class _FakeGoogleClient:
    """Substitui `httpx.AsyncClient` só dentro de `oauth_google.py`."""

    def __init__(self, token_response: _FakeResponse, userinfo_response: _FakeResponse):
        self._token_response = token_response
        self._userinfo_response = userinfo_response

    async def __aenter__(self):
        return self

    async def __aexit__(self, *exc):
        return False

    async def post(self, url, **kwargs):
        return self._token_response

    async def get(self, url, **kwargs):
        return self._userinfo_response


def _mock_google(monkeypatch, *, email="visitante@example.test", verified=True, token_ok=True, picture=None):
    token_res = _FakeResponse(200 if token_ok else 400, {"access_token": "fake-token"} if token_ok else {})
    info = {"email": email, "email_verified": verified}
    if picture:
        info["picture"] = picture
    info_res = _FakeResponse(200, info)
    monkeypatch.setattr(
        "app.routers.oauth_google.httpx.AsyncClient",
        lambda *a, **kw: _FakeGoogleClient(token_res, info_res),
    )


def _state_from_start(client) -> str:
    res = client.get("/api/auth/google/start", follow_redirects=False)
    assert res.status_code == 302
    query = parse_qs(urlparse(res.headers["location"]).query)
    assert urlparse(res.headers["location"]).netloc == "accounts.google.com"
    return query["state"][0]


def test_start_redirects_to_google_with_a_state(client):
    state = _state_from_start(client)
    assert state


def test_start_is_rate_limited_per_ip(client):
    from app.config import LIMITS

    for _ in range(LIMITS.google_start_per_ip):
        assert client.get("/api/auth/google/start", follow_redirects=False).status_code == 302
    assert client.get("/api/auth/google/start", follow_redirects=False).status_code == 429


def test_callback_signs_in_on_success(client, monkeypatch):
    _mock_google(monkeypatch, email="visitante@example.test")
    state = _state_from_start(client)

    res = client.get("/api/auth/google/callback", params={"state": state, "code": "abc123"}, follow_redirects=False)
    assert res.status_code == 302
    assert "entrar=ok" in res.headers["location"]
    assert "hs=" in res.headers["set-cookie"]


async def test_callback_saves_the_google_avatar(client, monkeypatch):
    from app import users_repo

    _mock_google(monkeypatch, email="visitante@example.test", picture="https://exemplo.test/foto.jpg")
    state = _state_from_start(client)
    client.get("/api/auth/google/callback", params={"state": state, "code": "abc123"}, follow_redirects=False)

    people = await users_repo.list_people()
    assert people[0]["avatar_url"] == "https://exemplo.test/foto.jpg"


def test_callback_rejects_a_missing_or_wrong_state(client, monkeypatch):
    _mock_google(monkeypatch)
    res = client.get("/api/auth/google/callback", params={"state": "isto-nao-e-um-estado-valido", "code": "abc123"}, follow_redirects=False)
    assert res.status_code == 302
    assert "erro" in res.headers["location"]
    assert "set-cookie" not in res.headers


def test_callback_rejects_an_unverified_email(client, monkeypatch):
    _mock_google(monkeypatch, verified=False)
    state = _state_from_start(client)
    res = client.get("/api/auth/google/callback", params={"state": state, "code": "abc123"}, follow_redirects=False)
    assert res.status_code == 302
    assert "erro" in res.headers["location"]
    assert "set-cookie" not in res.headers


def test_callback_reports_when_google_declines(client):
    res = client.get("/api/auth/google/callback", params={"error": "access_denied"}, follow_redirects=False)
    assert res.status_code == 302
    assert "erro" in res.headers["location"]


def test_callback_handles_a_failed_token_exchange(client, monkeypatch):
    _mock_google(monkeypatch, token_ok=False)
    state = _state_from_start(client)
    res = client.get("/api/auth/google/callback", params={"state": state, "code": "abc123"}, follow_redirects=False)
    assert res.status_code == 302
    assert "erro" in res.headers["location"]
