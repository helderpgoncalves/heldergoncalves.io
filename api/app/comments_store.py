# ─────────────────────────────────────────────────────────────────────
# Os comentários nos escritos.
#
# O mesmo NDJSON append-only de sempre: o estado de cada comentário é o
# da última linha que fala dele, e um `remover` é só mais uma linha, não
# um apagar a sério — o histórico fica, mesmo que já não se mostre.
#
# Não há fila de moderação: um comentário fica visível assim que chega,
# como um comentário normal na internet. O que há é o dono poder tirá-lo
# depois. É uma escolha, não um esquecimento — filas de moderação são um
# sistema à parte, e este site é pequeno o suficiente para não precisar.
#
# O email de quem comenta nunca sai daqui: fica guardado para o dono
# poder responder, mas nenhum endpoint o devolve a mais ninguém.
# ─────────────────────────────────────────────────────────────────────
import asyncio
import json
import secrets
from datetime import datetime, timezone
from typing import Optional

from app.config import COMMENTS

_rows: dict[str, dict] = {}
_lock = asyncio.Lock()


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="milliseconds").replace("+00:00", "Z")


def _load() -> None:
    try:
        raw = COMMENTS.file.read_text("utf-8")
    except OSError:
        return
    for line in raw.split("\n"):
        if not line.strip():
            continue
        try:
            row = json.loads(line)
        except ValueError:
            continue
        if isinstance(row, dict) and isinstance(row.get("id"), str):
            _rows[row["id"]] = row


async def init_comments_store() -> None:
    await asyncio.to_thread(_load)
    visible = sum(1 for r in _rows.values() if r.get("status") == "visivel")
    print(f"[comentarios] {visible} visíveis de {len(_rows)} registos")


def _append(row: dict) -> None:
    COMMENTS.file.parent.mkdir(parents=True, exist_ok=True)
    with open(COMMENTS.file, "a", encoding="utf-8") as fh:
        fh.write(json.dumps(row) + "\n")


async def _write(row: dict) -> None:
    _rows[row["id"]] = row
    async with _lock:
        await asyncio.to_thread(_append, row)


async def add_comment(post: str, lang: str, name: str, email: str, body: str) -> dict:
    row = {
        "id": secrets.token_urlsafe(6),
        "post": post,
        "lang": lang,
        "name": name,
        "email": email,
        "body": body,
        "status": "visivel",
        "at": _now_iso(),
    }
    await _write(row)
    return row


def for_post(post: str, limit: int) -> list[dict]:
    """Os comentários visíveis de um escrito, mais antigos primeiro — e
    nunca o email de quem os deixou."""
    visible = sorted(
        (r for r in _rows.values() if r.get("post") == post and r.get("status") == "visivel"),
        key=lambda r: r["at"],
    )
    return [{"id": r["id"], "name": r["name"], "body": r["body"], "at": r["at"]} for r in visible[-limit:]]


async def remove_comment(comment_id: str) -> Optional[dict]:
    before = _rows.get(comment_id)
    if not before or before.get("status") != "visivel":
        return None
    row = {**before, "status": "removido", "at": _now_iso()}
    await _write(row)
    return row
