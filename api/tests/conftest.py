# ─────────────────────────────────────────────────────────────────────
# O ambiente dos testes.
#
# `app.config` lê as variáveis de ambiente no import — por isso têm de
# estar definidas antes de qualquer módulo da aplicação ser importado.
# Este ficheiro corre primeiro que todos, e é onde isso acontece.
# ─────────────────────────────────────────────────────────────────────
import os
import shutil
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

_DATA_DIR = ROOT / "tests" / ".tmp-data"
_STATIC_DIR = ROOT / "tests" / ".tmp-dist"
# Apaga o que uma corrida anterior lá tenha deixado — os `*_store.py`
# (NDJSON) não sabem que é um directório de testes, só veem ficheiros
# com linhas dentro, e cada corrida nova acrescentaria às anteriores.
shutil.rmtree(_DATA_DIR, ignore_errors=True)
_DATA_DIR.mkdir(exist_ok=True)
_STATIC_DIR.mkdir(exist_ok=True)
(_STATIC_DIR / "index.html").write_text("<!doctype html><title>t</title>")

os.environ.setdefault("TESTING", "1")
os.environ.setdefault("SITE_ORIGIN", "https://example.test")
# Nunca `setdefault`: dentro do container `api` do docker-compose.dev.yml
# estas duas já vêm definidas para o ambiente de desenvolvimento normal
# (`/app/data`) — `setdefault` não as substituiria, e a suite escreveria
# a sério nos dados de desenvolvimento em vez de num directório à parte.
os.environ["DATA_DIR"] = str(_DATA_DIR)
os.environ["STATIC_DIR"] = str(_STATIC_DIR)
os.environ.setdefault("KNOWLEDGE_DIR", str(ROOT.parent / "knowledge"))
os.environ.setdefault("MAIL_PROVIDER", "resend")
os.environ.setdefault("RESEND_API_KEY", "re_test_0000000000000000")
os.environ.setdefault("SUBSCRIBE_SECRET", "um-segredo-de-teste-bem-longo-0000")
os.environ.setdefault("SESSION_SECRET", "outro-segredo-de-teste-bem-longo-0000")
os.environ.setdefault("OWNER_EMAIL", "dono@example.test")
os.environ.setdefault("GOOGLE_CLIENT_ID", "test-client-id-0000000000")
os.environ.setdefault("GOOGLE_CLIENT_SECRET", "test-client-secret-0000000000")
# A suite corre contra um Postgres a sério — dentro do container de dev,
# ver docker-compose.dev.yml. Uma base de dados própria para os testes,
# separada da que a API usa em desenvolvimento normal.
os.environ.setdefault(
    "DATABASE_URL",
    os.environ.get("TEST_DATABASE_URL", "postgresql+asyncpg://helder:helder@postgres:5432/heldergoncalves_test"),
)

import pytest  # noqa: E402
import pytest_asyncio  # noqa: E402


def _truncate(path) -> None:
    """Um `client` a seguir chama `lifespan`, que relê o NDJSON do disco
    — limpar só `_rows` em memória não chega, porque o teste seguinte
    reencontraria o que este escreveu."""
    try:
        path.write_text("")
    except OSError:
        pass


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
    from app.config import MEETINGS

    availability_store._rows.clear()
    yield
    availability_store._rows.clear()
    _truncate(MEETINGS.availability_file)


@pytest.fixture(autouse=True)
def _isolated_meetings_and_subscribers():
    """`meetings.py` e `subscribers.py` são o mesmo NDJSON append-only
    dos outros — um teste que marca uma reunião ou subscreve não pode
    deixá-la para o teste seguinte encontrar."""
    from app import meetings, subscribers
    from app.config import MEETINGS, NEWSLETTER

    meetings._rows.clear()
    subscribers._people.clear()
    yield
    meetings._rows.clear()
    subscribers._people.clear()
    _truncate(MEETINGS.file)
    _truncate(NEWSLETTER.file)


@pytest.fixture(autouse=True)
def _isolated_stores():
    """O mesmo princípio para as conversas, os comentários e as reações:
    cada teste começa e acaba com as listas em memória vazias, e sem
    nada escrito nos NDJSON que um `client` desse teste possa ter usado."""
    from app.chat_store import _turns
    from app.comments_store import _rows as comment_rows
    from app.config import CHAT_LOG_FILE, COMMENTS
    from app.reactions_store import _rows as reaction_rows

    _turns.clear()
    comment_rows.clear()
    reaction_rows.clear()
    yield
    _turns.clear()
    comment_rows.clear()
    reaction_rows.clear()
    _truncate(CHAT_LOG_FILE)
    _truncate(COMMENTS.file)
    _truncate(COMMENTS.reactions_file)


@pytest_asyncio.fixture(scope="session")
async def _schema():
    """Cria o esquema uma vez, no arranque da suite, e apaga-o no fim.
    `Base.metadata.create_all` (não o Alembic) é suficiente aqui: o que
    interessa aos testes é o esquema actual, não o histórico de como lá
    chegou — esse é o trabalho que o Alembic prova contra Postgres a
    sério, fora dos testes."""
    from app.db import Base, close_db, init_db
    import app.models  # noqa: F401 — regista as tabelas em Base.metadata

    await init_db()
    from app.db import get_engine

    engine = get_engine()
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    await close_db()
    yield


@pytest_asyncio.fixture(autouse=True)
async def _database(_schema):
    """Um engine por teste. `init_db()` é idempotente — se o teste também
    usar a fixture `client`, o `lifespan` da app chama `init_db()` outra
    vez e recebe o mesmo engine, sem o reabrir. Só esta fixture fecha a
    ligação, sempre por último: cada teste começa e acaba com as tabelas
    vazias."""
    from app.db import Base, close_db, get_engine, init_db

    await init_db()
    yield
    await init_db()  # o `lifespan` de um `client` usado no teste pode tê-la fechado
    engine = get_engine()
    async with engine.begin() as conn:
        for table in reversed(Base.metadata.sorted_tables):
            await conn.execute(table.delete())
    await close_db()


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
