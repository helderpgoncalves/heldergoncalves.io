# ─────────────────────────────────────────────────────────────────────
# As mensagens de contacto, guardadas.
#
# A segunda excepção deliberada ao «nada fica guardado», e pela mesma
# razão que a primeira (`chat_store.py`, ao lado, de onde este ficheiro
# tem o desenho todo): até aqui a mensagem de contacto saía por email e
# não ficava cópia nenhuma — o Hélder não tinha onde reler o que lhe
# escreveram, nem de onde responder. Agora fica, a política de
# privacidade diz que fica, e só o dono a lê (`routers/mail.py`, atrás
# de `require_owner`).
#
# Uma conversa é identificada pelo email de quem escreve. Escrever pelo
# site pede sessão e o remetente é sempre o email dela (ver
# `routers/contact.py`), por isso é sempre um email verdadeiro — nunca
# um campo de formulário que alguém encheu com o nome de outra pessoa.
#
# Append-only, como os outros: uma linha por mensagem, nunca se
# reescreve o ficheiro. Uma resposta do dono é mais uma linha na mesma
# conversa, marcada com `role: "dono"`.
# ─────────────────────────────────────────────────────────────────────
import asyncio
import json
from datetime import datetime, timezone

from app.config import CONTACTO_LOG_FILE, LIMITS

_messages: list[dict] = []
_lock = asyncio.Lock()

# Quem escreveu, e quem respondeu. Dois valores e mais nenhum — o resto
# do código compara com estes, não com texto solto.
PESSOA = "pessoa"
DONO = "dono"


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="milliseconds").replace("+00:00", "Z")


def conversation_id(email: str) -> str:
    return "email:" + email


def _load() -> None:
    try:
        raw = CONTACTO_LOG_FILE.read_text("utf-8")
    except OSError:
        return
    for line in raw.split("\n"):
        if not line.strip():
            continue
        try:
            row = json.loads(line)
        except ValueError:
            continue  # uma linha estragada não deita a caixa de entrada abaixo
        if isinstance(row, dict) and isinstance(row.get("conversation"), str):
            _messages.append(row)


async def init_contacto_store() -> None:
    await asyncio.to_thread(_load)
    print(f"[mail] {len(_messages)} mensagens guardadas de sessões anteriores")


def _append(row: dict) -> None:
    CONTACTO_LOG_FILE.parent.mkdir(parents=True, exist_ok=True)
    with open(CONTACTO_LOG_FILE, "a", encoding="utf-8") as fh:
        fh.write(json.dumps(row) + "\n")


async def record_message(conv_id: str, email: str, role: str, subject: str, text: str) -> None:
    row = {
        "conversation": conv_id,
        "email": email,
        "role": role,
        "subject": subject,
        "text": text,
        "at": _now_iso(),
    }
    _messages.append(row)
    async with _lock:
        await asyncio.to_thread(_append, row)


def conversations(limit: int = 0) -> list[dict]:
    """Uma linha por pessoa: quem é, o assunto da última, o princípio
    dela, quando foi, e quantas já escreveu — para o dono escolher qual
    abrir, não ler tudo de uma vez. O excerto vem cortado daqui pela
    mesma razão que em `chat_store.conversations`: a lista mostra duas
    linhas, e mandar a mensagem inteira de cada pessoa era pagar a
    transferência toda para deitar fora quase tudo."""
    grouped: dict[str, dict] = {}
    for row in _messages:
        conv = row["conversation"]
        entry = grouped.setdefault(
            conv,
            {"conversation": conv, "email": row.get("email"), "subject": "", "preview": "", "last": None, "messages": 0},
        )
        entry["messages"] += 1
        entry["last"] = row.get("at") or entry["last"]
        # O assunto e o excerto são sempre os da última mensagem — é o
        # que a Mail mostra na linha, e o que diz onde a conversa vai.
        entry["subject"] = str(row.get("subject") or "")
        entry["preview"] = " ".join(str(row.get("text") or "").split())[: LIMITS.mail_preview]
    out = sorted(grouped.values(), key=lambda e: e["last"] or "", reverse=True)
    return out[: limit or LIMITS.mail_conversations]


def transcript(conv_id: str, limit: int = 0) -> list[dict]:
    """As mensagens de uma conversa, mais antigas primeiro."""
    rows = [r for r in _messages if r["conversation"] == conv_id]
    return [
        {"role": r.get("role"), "subject": r.get("subject"), "text": r.get("text"), "at": r.get("at")}
        for r in rows[-(limit or LIMITS.mail_messages) :]
    ]


def email_of(conv_id: str) -> str:
    """O email a quem uma resposta vai. Sai daqui, e não do que o browser
    mandar: quem responde escolhe uma conversa, não um destinatário."""
    for row in reversed(_messages):
        if row["conversation"] == conv_id and row.get("email"):
            return str(row["email"])
    return ""
