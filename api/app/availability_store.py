# ─────────────────────────────────────────────────────────────────────
# O que o dono muda na disponibilidade, por cima das janelas fixas de
# `config.py` (`MEETINGS_DAYS`, `MEETINGS_WINDOWS`).
#
# Dois tipos de linha, o mesmo NDJSON append-only dos outros dois
# ficheiros de dados: um **bloqueio** tira um período que seria livre
# (férias, uma manhã ocupada); uma **abertura** dá um período extra fora
# das janelas normais (um sábado, uma exceção). `availability.py` lê
# isto e junta às janelas fixas antes de calcular os horários livres —
# é o que faz um bloqueio ou uma abertura valer para toda a gente que
# vê o Calendário, não só para o dono.
# ─────────────────────────────────────────────────────────────────────
import asyncio
import json
import secrets
from datetime import datetime, timezone
from typing import Optional

from app.config import MEETINGS

_rows: dict[str, dict] = {}
_lock = asyncio.Lock()

KINDS = ("bloqueio", "abertura")


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="milliseconds").replace("+00:00", "Z")


def _load() -> None:
    try:
        raw = MEETINGS.availability_file.read_text("utf-8")
    except OSError:
        return
    for line in raw.split("\n"):
        if not line.strip():
            continue
        try:
            row = json.loads(line)
        except ValueError:
            continue  # uma linha estragada não deita a lista abaixo
        if isinstance(row, dict) and isinstance(row.get("id"), str):
            _rows[row["id"]] = row


async def init_availability_store() -> None:
    await asyncio.to_thread(_load)
    print(f"[disponibilidade] {len(active_overrides())} alterações activas de {len(_rows)} registos")


def _append(row: dict) -> None:
    MEETINGS.availability_file.parent.mkdir(parents=True, exist_ok=True)
    with open(MEETINGS.availability_file, "a", encoding="utf-8") as fh:
        fh.write(json.dumps(row) + "\n")


async def _write(row: dict) -> None:
    _rows[row["id"]] = row
    async with _lock:
        await asyncio.to_thread(_append, row)


def active_overrides(kind: Optional[str] = None) -> list[dict]:
    """As alterações em vigor, mais recentes primeiro."""
    rows = [r for r in _rows.values() if r.get("status") == "ativo" and (kind is None or r.get("kind") == kind)]
    return sorted(rows, key=lambda r: r["start"])


async def add_override(kind: str, start: str, end: str, note: str) -> dict:
    row = {
        "id": secrets.token_urlsafe(6),
        "kind": kind,
        "start": start,
        "end": end,
        "note": note,
        "status": "ativo",
        "at": _now_iso(),
    }
    await _write(row)
    return row


async def remove_override(override_id: str) -> Optional[dict]:
    before = _rows.get(override_id)
    if not before or before.get("status") != "ativo":
        return None
    row = {**before, "status": "removido", "at": _now_iso()}
    await _write(row)
    return row
