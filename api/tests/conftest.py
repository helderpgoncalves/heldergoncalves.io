# ─────────────────────────────────────────────────────────────────────
# O ambiente dos testes.
#
# `app.config` lê as variáveis de ambiente no import — por isso têm de
# estar definidas antes de qualquer módulo da aplicação ser importado.
# Este ficheiro corre primeiro que todos, e é onde isso acontece.
# ─────────────────────────────────────────────────────────────────────
import os
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

_DATA_DIR = ROOT / "tests" / ".tmp-data"
_STATIC_DIR = ROOT / "tests" / ".tmp-dist"
_DATA_DIR.mkdir(exist_ok=True)
_STATIC_DIR.mkdir(exist_ok=True)
(_STATIC_DIR / "index.html").write_text("<!doctype html><title>t</title>")

os.environ.setdefault("SITE_ORIGIN", "https://example.test")
os.environ.setdefault("DATA_DIR", str(_DATA_DIR))
os.environ.setdefault("STATIC_DIR", str(_STATIC_DIR))
os.environ.setdefault("KNOWLEDGE_DIR", str(ROOT.parent / "knowledge"))
os.environ.setdefault("MAIL_PROVIDER", "resend")
os.environ.setdefault("RESEND_API_KEY", "re_test_0000000000000000")
os.environ.setdefault("SUBSCRIBE_SECRET", "um-segredo-de-teste-bem-longo-0000")
os.environ.setdefault("SESSION_SECRET", "outro-segredo-de-teste-bem-longo-0000")
os.environ.setdefault("OWNER_EMAIL", "dono@example.test")
os.environ.setdefault("GOOGLE_CLIENT_ID", "test-client-id-0000000000")
os.environ.setdefault("GOOGLE_CLIENT_SECRET", "test-client-secret-0000000000")

import pytest  # noqa: E402


@pytest.fixture(autouse=True)
def _isolated_hits():
    """Cada teste começa com os limites por visitante a zeros — senão o
    teste anterior consumia a quota do próximo."""
    from app import security

    security._hits.clear()
    security._used_tokens.clear()
    yield


@pytest.fixture(autouse=True)
def _isolated_availability_overrides():
    """Os bloqueios e aberturas de um teste não podem sobreviver para o
    seguinte — sobretudo porque vários testes calculam `free_slots` para
    o mesmo dia («o próximo dia útil»)."""
    from app import availability_store

    availability_store._rows.clear()
    yield
    availability_store._rows.clear()


@pytest.fixture(autouse=True)
def _isolated_stores():
    """O mesmo princípio para as conversas, os comentários e as reações:
    cada teste começa e acaba com as listas em memória vazias."""
    from app import chat_store, comments_store, reactions_store

    chat_store._turns.clear()
    comments_store._rows.clear()
    reactions_store._rows.clear()
    yield
    chat_store._turns.clear()
    comments_store._rows.clear()
    reactions_store._rows.clear()


# ── Partilhado pelos testes de integração ────────────────────────────
@pytest.fixture()
def client():
    from fastapi.testclient import TestClient

    from app.main import app

    with TestClient(app) as c:
        yield c


@pytest.fixture()
def fake_mail(monkeypatch):
    """Nenhum teste manda email a sério. `sent` guarda o que teria saído."""
    sent = []

    async def fake(*args, **kwargs):
        sent.append(kwargs or args)
        return True

    monkeypatch.setattr("app.mail.send_mail", fake)
    monkeypatch.setattr("app.routers.subscribe.send_mail", fake)
    monkeypatch.setattr("app.routers.auth.send_mail", fake)
    monkeypatch.setattr("app.routers.reunioes.send_mail", fake)
    return sent


def token_for(client) -> str:
    return client.get("/api/token").json()["token"]


def sign_in(client, email: str) -> None:
    """Põe uma sessão válida sem passar pelo código por email ou pela
    Google — isso já tem teste próprio. Aqui interessa só quem pode
    fazer o quê depois de ter entrado."""
    from app.sessions import session_cookie

    value = session_cookie(email).split(";", 1)[0].split("=", 1)[1]
    client.cookies.set("hs", value)
