# ─────────────────────────────────────────────────────────────────────
# A lista de quem subscreveu o blog.
#
# Um ficheiro NDJSON: uma linha por acontecimento, sempre acrescentada
# ao fim, nunca reescrita. Ficar-se por acrescentar tem três vantagens
# que valem mais do que a elegância de um ficheiro pequeno: uma queda a
# meio de uma escrita não estraga o que já lá estava, o histórico de
# quem entrou e saiu fica guardado, e o ficheiro lê-se com `cat`.
#
# O estado de cada email é o da última linha que fala dele. Ao arrancar
# lê-se tudo uma vez e fica um dicionário em memória.
#
# A lista nunca é servida por HTTP. Não há endpoint que a devolva, nem
# sequer contando quantos são: quem a quer, lê o ficheiro no servidor.
# ─────────────────────────────────────────────────────────────────────
import asyncio
import base64
import hashlib
import hmac
import json
import secrets
import time
from datetime import datetime, timezone
from typing import Optional
from urllib.parse import urlencode

from app.config import DATA_DIR, NEWSLETTER

_people: dict[str, dict] = {}
_secret: Optional[bytes] = None
_lock = asyncio.Lock()


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="milliseconds").replace("+00:00", "Z")


def _ensure_dir() -> None:
    NEWSLETTER.file.parent.mkdir(parents=True, exist_ok=True)


def _load_secret() -> bytes:
    """O segredo que assina as ligações de confirmação. Ao contrário do
    segredo dos formulários, este TEM de sobreviver a reinícios: uma
    ligação já enviada por email tem de continuar a valer amanhã. Vem da
    configuração; se não vier, gera-se uma vez e guarda-se ao lado da
    lista."""
    if len(NEWSLETTER.secret) >= 16:
        return NEWSLETTER.secret.encode()
    secret_file = DATA_DIR / ".subscribe-secret"
    try:
        saved = secret_file.read_text().strip()
        if len(saved) >= 32:
            return bytes.fromhex(saved)
    except OSError:
        pass
    fresh = secrets.token_bytes(32)
    _ensure_dir()
    secret_file.write_text(fresh.hex())
    secret_file.chmod(0o600)
    print(f"[newsletter] segredo novo gerado em {secret_file}")
    return fresh


def _load_people() -> None:
    try:
        raw = NEWSLETTER.file.read_text("utf-8")
    except OSError:
        return
    for line in raw.split("\n"):
        if not line.strip():
            continue
        try:
            row = json.loads(line)
        except ValueError:
            continue  # uma linha estragada não deita a lista abaixo
        if isinstance(row, dict) and isinstance(row.get("email"), str):
            _people[row["email"]] = row


async def init_subscribers() -> None:
    global _secret
    _secret = await asyncio.to_thread(_load_secret)
    await asyncio.to_thread(_load_people)
    active = sum(1 for p in _people.values() if p.get("status") == "active")
    print(f"[newsletter] {active} subscrições activas de {len(_people)} registos")


async def _write(row: dict) -> None:
    _people[row["email"]] = row
    async with _lock:
        await asyncio.to_thread(_append, row)


def _append(row: dict) -> None:
    _ensure_dir()
    with open(NEWSLETTER.file, "a", encoding="utf-8") as fh:
        fh.write(json.dumps(row) + "\n")


def normalize(email: str) -> str:
    return email.strip().lower()


def status_of(email: str) -> Optional[str]:
    row = _people.get(normalize(email))
    return row.get("status") if row else None


async def mark_pending(email: str, lang: str) -> None:
    """Regista uma intenção de subscrever. Ainda não vale nada: só passa a
    valer quando a pessoa carregar na ligação que lhe é enviada."""
    key = normalize(email)
    before = _people.get(key)
    now = _now_iso()
    await _write(
        {
            "email": key,
            "lang": "en" if lang == "en" else "pt",
            "status": "pending",
            "at": now,
            "since": (before or {}).get("since", now),
        }
    )


async def mark_active(email: str) -> bool:
    key = normalize(email)
    before = _people.get(key)
    if not before:
        return False
    now = _now_iso()
    await _write({**before, "status": "active", "at": now, "confirmedAt": now})
    return True


async def mark_gone(email: str) -> bool:
    key = normalize(email)
    before = _people.get(key)
    if not before:
        return False
    await _write({**before, "status": "gone", "at": _now_iso()})
    return True


# ── As ligações assinadas ────────────────────────────────────────────
# Uma ligação leva o email, o instante e uma assinatura dos dois. Não há
# nada guardado do lado do servidor à espera dela: se a assinatura bate
# certo e não expirou, é boa. Isso quer dizer que reiniciar não invalida
# nada, e que não há tabela de tokens a crescer.
def _sign(kind: str, email: str, stamp: str) -> str:
    assert _secret is not None
    return base64.urlsafe_b64encode(
        hmac.new(_secret, f"{kind}.{email}.{stamp}".encode(), hashlib.sha256).digest()
    ).decode().rstrip("=")


def link_for(origin: str, kind: str, email: str) -> str:
    key = normalize(email)
    stamp = str(int(time.time() * 1000))
    query = urlencode(
        {
            "e": base64.urlsafe_b64encode(key.encode()).decode().rstrip("="),
            "t": stamp,
            "s": _sign(kind, key, stamp),
        }
    )
    return f"{origin}/api/subscribe/{kind}?{query}"


def read_link(kind: str, params: dict) -> Optional[str]:
    """Confere a ligação e devolve o email — ou None.
    O cancelamento não expira: uma pessoa tem de poder sair de uma lista
    a partir de um email de há dois anos."""
    if _secret is None:
        return None
    raw = params.get("e", "")
    stamp = params.get("t", "")
    given = params.get("s", "")
    if len(raw) > 300 or len(given) > 100 or not stamp.isdigit() or not (10 <= len(stamp) <= 16):
        return None
    try:
        padded = raw + "=" * (-len(raw) % 4)
        email = base64.urlsafe_b64decode(padded).decode("utf-8")
    except (ValueError, UnicodeDecodeError):
        return None
    if not email or len(email) > 160:
        return None
    if not hmac.compare_digest(given, _sign(kind, email, stamp)):
        return None
    if kind == "confirm" and (time.time() * 1000 - int(stamp)) > NEWSLETTER.confirm_window * 1000:
        return None
    return email
