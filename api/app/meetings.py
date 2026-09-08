# ─────────────────────────────────────────────────────────────────────
# As reuniões marcadas.
#
# O mesmo feitio da lista da newsletter: um NDJSON, uma linha por
# acontecimento, sempre acrescentada ao fim. O estado de cada reunião é
# o da última linha que fala dela. Lê-se tudo ao arrancar e fica um
# dicionário em memória.
#
# Nunca se serve a lista inteira por HTTP: cada pessoa vê as suas, e o
# que o calendário mostra aos outros é só que a hora já não está livre.
# ─────────────────────────────────────────────────────────────────────
import asyncio
import json
import secrets
from datetime import datetime, timezone
from typing import Optional

from app.config import MEETINGS

_rows: dict[str, dict] = {}
_lock = asyncio.Lock()


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="milliseconds").replace("+00:00", "Z")


def _load() -> None:
    try:
        raw = MEETINGS.file.read_text("utf-8")
    except OSError:
        print("[reunioes] sem ficheiro ainda")
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


async def init_meetings() -> None:
    await asyncio.to_thread(_load)
    print(f"[reunioes] {len(booked_starts())} marcadas de {len(_rows)} registos")


def _append(row: dict) -> None:
    MEETINGS.file.parent.mkdir(parents=True, exist_ok=True)
    with open(MEETINGS.file, "a", encoding="utf-8") as fh:
        fh.write(json.dumps(row) + "\n")


async def _write(row: dict) -> None:
    _rows[row["id"]] = row
    async with _lock:
        await asyncio.to_thread(_append, row)


def booked_starts() -> set[str]:
    """Os inícios ocupados — o que o calendário precisa para tirar horários."""
    return {row["start"] for row in _rows.values() if row.get("status") == "booked"}


def list_for(email: str) -> list[dict]:
    """As reuniões desta pessoa, futuras primeiro."""
    mine = sorted(
        (r for r in _rows.values() if r.get("email") == email and r.get("status") == "booked"),
        key=lambda r: r["start"],
    )
    return [{"id": r["id"], "start": r["start"], "end": r["end"], "title": r.get("title"), "note": r.get("note")} for r in mine]


def all_between(from_day: str, to_day: str) -> list[dict]:
    """Todas as reuniões marcadas num intervalo de dias — só para o dono
    ver a agenda cheia. Ao contrário de `list_for`, leva o email de quem
    marcou: é exactamente o que não se serve a mais ninguém."""
    rows = [r for r in _rows.values() if r.get("status") == "booked" and from_day <= r["start"][:10] <= to_day]
    return sorted(rows, key=lambda r: r["start"])


def booked_today(email: str) -> int:
    """Quantas esta pessoa marcou hoje — para ninguém encher a agenda."""
    today = datetime.now(timezone.utc).date().isoformat()
    return sum(
        1
        for r in _rows.values()
        if r.get("email") == email and r.get("status") == "booked" and r.get("at", "")[:10] == today
    )


async def book(email: str, start: str, end: str, title: str, note: str, lang: str) -> dict:
    row = {
        "id": secrets.token_urlsafe(6),
        "email": email,
        "start": start,
        "end": end,
        "title": title,
        "note": note,
        "lang": lang,
        "status": "booked",
        "at": _now_iso(),
    }
    await _write(row)
    return row


async def cancel(meeting_id: str, email: str) -> Optional[dict]:
    before = _rows.get(meeting_id)
    if not before or before.get("email") != email or before.get("status") != "booked":
        return None
    row = {**before, "status": "cancelled", "at": _now_iso()}
    await _write(row)
    return row
