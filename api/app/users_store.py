# ─────────────────────────────────────────────────────────────────────
# Quem já entrou — não a sessão em si (essa é `sessions.py`, sem
# estado), mas o registo de visitas para o dono ver na app Pessoas.
#
# O mesmo NDJSON append-only de sempre: cada sessão nova acrescenta uma
# linha, e o estado actual de um email é a agregação de todas as suas
# linhas — primeira vista, última vista, e quantas vezes.
# ─────────────────────────────────────────────────────────────────────
import asyncio
import json
from datetime import datetime, timezone

from app.config import USERS

_rows: dict[str, dict] = {}
_lock = asyncio.Lock()


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="milliseconds").replace("+00:00", "Z")


def _fold(email: str, via: str, at: str) -> dict:
    """O registo de um email depois de mais uma visita a `at`."""
    existing = _rows.get(email)
    return {
        "email": email,
        "via": via,
        "first_seen": existing["first_seen"] if existing else at,
        "last_seen": at,
        "visits": (existing["visits"] + 1) if existing else 1,
    }


def _load() -> None:
    try:
        raw = USERS.file.read_text("utf-8")
    except OSError:
        return
    for line in raw.split("\n"):
        if not line.strip():
            continue
        try:
            row = json.loads(line)
        except ValueError:
            continue
        if not (isinstance(row, dict) and isinstance(row.get("email"), str)):
            continue
        _rows[row["email"]] = _fold(row["email"], row.get("via", ""), row.get("last_seen", ""))


async def init_users_store() -> None:
    await asyncio.to_thread(_load)
    print(f"[pessoas] {len(_rows)} registos")


def _append(row: dict) -> None:
    USERS.file.parent.mkdir(parents=True, exist_ok=True)
    with open(USERS.file, "a", encoding="utf-8") as fh:
        fh.write(json.dumps(row) + "\n")


async def record_visit(email: str, via: str) -> None:
    """Uma sessão nasceu para este email — actualiza o registo."""
    row = _fold(email, via, _now_iso())
    _rows[email] = row
    async with _lock:
        await asyncio.to_thread(_append, row)


def list_people() -> list[dict]:
    """Quem já entrou, mais recente primeiro."""
    return sorted(_rows.values(), key=lambda r: r["last_seen"], reverse=True)
