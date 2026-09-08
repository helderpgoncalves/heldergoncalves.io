# ─────────────────────────────────────────────────────────────────────
# As reações nos escritos — um toque, não um formulário.
#
# O mesmo NDJSON append-only: cada linha diz se uma impressão digital
# tem uma reação ligada ou desligada num escrito, e a última linha por
# (escrito, tipo, impressão) vence. Voltar a tocar desliga — como
# qualquer botão de "gosto" — sem precisar de uma tabela à parte para
# saber o que já estava ligado.
# ─────────────────────────────────────────────────────────────────────
import asyncio
import json
from datetime import datetime, timezone

from app.config import COMMENTS

KINDS = ("gosto", "adorei", "ideia")

_rows: dict[tuple[str, str, str], dict] = {}
_lock = asyncio.Lock()


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="milliseconds").replace("+00:00", "Z")


def _load() -> None:
    try:
        raw = COMMENTS.reactions_file.read_text("utf-8")
    except OSError:
        return
    for line in raw.split("\n"):
        if not line.strip():
            continue
        try:
            row = json.loads(line)
        except ValueError:
            continue
        if isinstance(row, dict) and row.get("post") and row.get("kind") and row.get("key"):
            _rows[(row["post"], row["kind"], row["key"])] = row


async def init_reactions_store() -> None:
    await asyncio.to_thread(_load)
    active = sum(1 for r in _rows.values() if r.get("active"))
    print(f"[reacoes] {active} activas de {len(_rows)} registos")


def _append(row: dict) -> None:
    COMMENTS.reactions_file.parent.mkdir(parents=True, exist_ok=True)
    with open(COMMENTS.reactions_file, "a", encoding="utf-8") as fh:
        fh.write(json.dumps(row) + "\n")


async def toggle(post: str, kind: str, fingerprint: str) -> bool:
    """Liga a reação se estava desligada, e vice-versa. Devolve o estado novo."""
    was_active = bool(_rows.get((post, kind, fingerprint), {}).get("active"))
    row = {"post": post, "kind": kind, "key": fingerprint, "active": not was_active, "at": _now_iso()}
    _rows[(post, kind, fingerprint)] = row
    async with _lock:
        await asyncio.to_thread(_append, row)
    return row["active"]


def counts_for(post: str) -> dict[str, int]:
    counts = {k: 0 for k in KINDS}
    for (p, kind, _fp), row in _rows.items():
        if p == post and row.get("active"):
            counts[kind] = counts.get(kind, 0) + 1
    return counts


def mine_for(post: str, fingerprint: str) -> list[str]:
    """Em que reações esta impressão digital está ligada, neste escrito."""
    return [kind for (p, kind, fp), row in _rows.items() if p == post and fp == fingerprint and row.get("active")]
