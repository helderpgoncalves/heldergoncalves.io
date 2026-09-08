# ─────────────────────────────────────────────────────────────────────
# Postgres, assíncrono do princípio ao fim.
#
# Um `AsyncEngine` só, criado uma vez no arranque. Cada pedido HTTP abre
# a sua própria `AsyncSession` (ver `session_scope`) e fecha-a no fim —
# nunca uma sessão partilhada entre pedidos. `asyncpg` por baixo: uma
# consulta aqui nunca bloqueia o event loop, como uma chamada ao
# `yfinance` bloquearia se não corresse em `asyncio.to_thread`.
# ─────────────────────────────────────────────────────────────────────
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from sqlalchemy.ext.asyncio import AsyncEngine, AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase
from sqlalchemy.pool import NullPool

from app.config import DATABASE_URL, TESTING


class Base(DeclarativeBase):
    """A base de todos os modelos — ver `app/models/`."""


_engine: AsyncEngine | None = None
_sessionmaker: async_sessionmaker[AsyncSession] | None = None


def get_engine() -> AsyncEngine:
    assert _engine is not None, "init_db() ainda não correu"
    return _engine


async def init_db() -> None:
    """Idempotente: chamar outra vez sem fechar primeiro não faz nada —
    é o que permite à `app` (lifespan) e aos testes de repositório
    partilharem o mesmo engine sem se pisarem.

    Em testes (`TESTING`), sem *pool*: uma fixture `async def` e o
    `TestClient` síncrono correm em *event loops* diferentes, e uma
    ligação `asyncpg` aberta num não serve no outro — `NullPool` abre
    uma ligação nova por operação, em vez de reaproveitar uma presa ao
    loop errado. Fora de testes o custo não se põe: o pedido HTTP e o
    `lifespan` correm sempre no mesmo loop."""
    global _engine, _sessionmaker
    if _engine is not None:
        return
    _engine = create_async_engine(DATABASE_URL, pool_pre_ping=True, poolclass=NullPool if TESTING else None)
    _sessionmaker = async_sessionmaker(_engine, expire_on_commit=False)


async def close_db() -> None:
    global _engine, _sessionmaker
    if _engine is not None:
        await _engine.dispose()
    _engine = None
    _sessionmaker = None


@asynccontextmanager
async def session_scope() -> AsyncIterator[AsyncSession]:
    """Uma sessão por pedido: comita se tudo correu bem, desfaz senão."""
    assert _sessionmaker is not None, "init_db() ainda não correu"
    async with _sessionmaker() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
