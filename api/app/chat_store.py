# ─────────────────────────────────────────────────────────────────────
# As conversas das Mensagens, guardadas.
#
# Excepção deliberada ao resto do site: em todo o lado mais, o texto de
# quem visita não fica — nem o do contacto, nem o das Mensagens antes
# desta funcionalidade existir. Aqui fica, porque é o que dá ao Hélder
# o contexto de quem já falou com o assistente antes, e uma caixa de
# entrada para reler. Está num ficheiro à parte, e a política de
# privacidade diz que existe.
#
# Uma conversa é identificada por quem a começou: o email, se a pessoa
# tinha sessão; senão, a mesma impressão digital que já limita os
# pedidos — que muda a cada reinício, tal como em todo o resto do site,
# por isso as conversas de visitantes anónimos não se seguem de sessão
# para sessão.
# ─────────────────────────────────────────────────────────────────────
import asyncio
import json
from datetime import datetime, timezone
from typing import Optional

from app.config import CHAT_LOG_FILE

_turns: list[dict] = []
_lock = asyncio.Lock()


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="milliseconds").replace("+00:00", "Z")


def conversation_id(email: Optional[str], fingerprint: str) -> str:
    return ("email:" + email) if email else ("visitante:" + fingerprint)


def _load() -> None:
    try:
        raw = CHAT_LOG_FILE.read_text("utf-8")
    except OSError:
        return
    for line in raw.split("\n"):
        if not line.strip():
            continue
        try:
            row = json.loads(line)
        except ValueError:
            continue  # uma linha estragada não deita o histórico abaixo
        if isinstance(row, dict) and isinstance(row.get("conversation"), str):
            _turns.append(row)


async def init_chat_store() -> None:
    await asyncio.to_thread(_load)
    print(f"[conversas] {len(_turns)} mensagens guardadas de sessões anteriores")


def _append(row: dict) -> None:
    CHAT_LOG_FILE.parent.mkdir(parents=True, exist_ok=True)
    with open(CHAT_LOG_FILE, "a", encoding="utf-8") as fh:
        fh.write(json.dumps(row) + "\n")


async def record_turn(conv_id: str, email: Optional[str], role: str, text: str, lang: str) -> None:
    row = {"conversation": conv_id, "email": email, "role": role, "text": text, "lang": lang, "at": _now_iso()}
    _turns.append(row)
    async with _lock:
        await asyncio.to_thread(_append, row)


def conversations(limit: int = 200) -> list[dict]:
    """Uma linha por conversa: quem é, quantas mensagens, e quando foi a
    última — para o dono escolher qual abrir, não ler tudo de uma vez."""
    grouped: dict[str, dict] = {}
    for row in _turns:
        conv = row["conversation"]
        entry = grouped.setdefault(conv, {"conversation": conv, "email": row.get("email"), "turns": 0, "last": None})
        entry["turns"] += 1
        entry["last"] = row.get("at") or entry["last"]
    out = sorted(grouped.values(), key=lambda e: e["last"] or "", reverse=True)
    return out[:limit]


def transcript(conv_id: str, limit: int = 400) -> list[dict]:
    """As mensagens de uma conversa, mais antigas primeiro."""
    turns = [r for r in _turns if r["conversation"] == conv_id]
    return [{"role": r.get("role"), "text": r.get("text"), "at": r.get("at")} for r in turns[-limit:]]
