# ─────────────────────────────────────────────────────────────────────
# O caderno do dono: as consultas da tabela `escritos`.
#
# Só o dono lê e escreve aqui (ver routers/escritos.py). O que sai
# daqui vai inteiro para o cliente — não há nada de visitantes nesta
# tabela, por isso não há nada a esconder.
# ─────────────────────────────────────────────────────────────────────
import uuid
from datetime import datetime, timezone
from typing import Optional

from sqlalchemy import select

from app.db import session_scope
from app.models.escrito import PUBLICADO, RASCUNHO, Escrito

# Os campos que o cliente pode mudar num rascunho — e só estes. O
# estado e as datas mudam por acções (`save`, `mark_published`), nunca
# por um campo enviado.
EDITAVEIS = ("slug", "lang", "titulo", "descricao", "tags", "chave", "corpo")


def _to_dict(row: Escrito) -> dict:
    return {
        "id": str(row.id),
        "slug": row.slug,
        "lang": row.lang,
        "titulo": row.titulo,
        "descricao": row.descricao,
        "tags": list(row.tags or []),
        "chave": row.chave,
        "corpo": row.corpo,
        "estado": row.estado,
        "criado_em": row.criado_em.isoformat(),
        "atualizado_em": row.atualizado_em.isoformat(),
        "publicado_em": row.publicado_em.isoformat() if row.publicado_em else None,
        "commit_sha": row.commit_sha,
    }


def _parse_id(value: Optional[str]) -> Optional[uuid.UUID]:
    try:
        return uuid.UUID(str(value)) if value else None
    except ValueError:
        return None


async def list_all() -> list[dict]:
    """Tudo o que o dono tem, o mexido mais recentemente primeiro."""
    async with session_scope() as session:
        rows = await session.scalars(select(Escrito).order_by(Escrito.atualizado_em.desc()))
        return [_to_dict(row) for row in rows]


async def get(escrito_id: str) -> Optional[dict]:
    key = _parse_id(escrito_id)
    if key is None:
        return None
    async with session_scope() as session:
        row = await session.get(Escrito, key)
        return _to_dict(row) if row else None


async def save(escrito_id: Optional[str], fields: dict) -> Optional[dict]:
    """Cria um rascunho (sem `escrito_id`) ou actualiza um que já existe.

    Mexer num escrito já publicado torna-o rascunho outra vez: o que
    está no site deixou de ser o que está aqui, e publicar de novo é a
    forma de os voltar a pôr de acordo. `None` se o id não existir."""
    now = datetime.now(timezone.utc)
    data = {k: v for k, v in fields.items() if k in EDITAVEIS}
    async with session_scope() as session:
        if escrito_id:
            key = _parse_id(escrito_id)
            row = await session.get(Escrito, key) if key else None
            if row is None:
                return None
            for k, v in data.items():
                setattr(row, k, v)
            row.estado = RASCUNHO
            row.atualizado_em = now
        else:
            row = Escrito(criado_em=now, atualizado_em=now, estado=RASCUNHO, **data)
            session.add(row)
        await session.flush()
        return _to_dict(row)


async def delete(escrito_id: str) -> bool:
    key = _parse_id(escrito_id)
    if key is None:
        return False
    async with session_scope() as session:
        row = await session.get(Escrito, key)
        if row is None:
            return False
        await session.delete(row)
        return True


async def mark_published(escrito_id: str, commit_sha: str) -> Optional[dict]:
    key = _parse_id(escrito_id)
    if key is None:
        return None
    now = datetime.now(timezone.utc)
    async with session_scope() as session:
        row = await session.get(Escrito, key)
        if row is None:
            return None
        row.estado = PUBLICADO
        row.publicado_em = now
        row.commit_sha = commit_sha
        await session.flush()
        return _to_dict(row)
