# ─────────────────────────────────────────────────────────────────────
# Quem já entrou — a versão Postgres de `users_store.py`.
#
# O mesmo contrato de antes (`record_visit`, `list_people`), para os
# routers que já os chamam não mudarem de forma. O que muda é o sítio
# onde o estado vive: uma tabela, não um NDJSON em memória.
# ─────────────────────────────────────────────────────────────────────
from datetime import datetime, timezone
from typing import Optional

from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert

from app.db import session_scope
from app.models.user import User


async def record_visit(email: str, avatar_url: Optional[str] = None) -> None:
    """Uma sessão nasceu para este email — cria o registo, ou soma-lhe
    mais uma visita se já existia.

    O mesmo email pode entrar por código hoje e pela Google amanhã —
    não são contas diferentes, é a mesma linha. `avatar_url` só chega
    de uma sessão Google; entrar por código não apaga um avatar já
    guardado (por isso o `COALESCE`, não uma substituição directa)."""
    now = datetime.now(timezone.utc)
    async with session_scope() as session:
        stmt = insert(User).values(
            email=email, criado_em=now, ultima_visita=now, visitas=1, avatar_url=avatar_url
        )
        stmt = stmt.on_conflict_do_update(
            index_elements=[User.email],
            set_={
                "ultima_visita": now,
                "visitas": User.visitas + 1,
                "avatar_url": stmt.excluded.avatar_url if avatar_url else User.avatar_url,
            },
        )
        await session.execute(stmt)


async def list_people() -> list[dict]:
    """Quem já entrou, mais recente primeiro."""
    async with session_scope() as session:
        rows = await session.scalars(select(User).order_by(User.ultima_visita.desc()))
        return [
            {
                "email": row.email,
                "first_seen": row.criado_em.isoformat(),
                "last_seen": row.ultima_visita.isoformat(),
                "visits": row.visitas,
                "avatar_url": row.avatar_url,
            }
            for row in rows
        ]
