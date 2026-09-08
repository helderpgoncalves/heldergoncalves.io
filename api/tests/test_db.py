# ─────────────────────────────────────────────────────────────────────
# app/db.py — o engine e a sessão por pedido.
# ─────────────────────────────────────────────────────────────────────
import pytest
from sqlalchemy import select

from app.db import session_scope
from app.models.user import User


async def test_session_scope_commits_on_success():
    async with session_scope() as session:
        session.add(User(email="commita@example.test"))

    async with session_scope() as session:
        row = await session.scalar(select(User).where(User.email == "commita@example.test"))
        assert row is not None


async def test_session_scope_rolls_back_on_error():
    with pytest.raises(RuntimeError):
        async with session_scope() as session:
            session.add(User(email="nunca-fica@example.test"))
            await session.flush()
            raise RuntimeError("algo correu mal a meio")

    async with session_scope() as session:
        row = await session.scalar(select(User).where(User.email == "nunca-fica@example.test"))
        assert row is None
