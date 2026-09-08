# ─────────────────────────────────────────────────────────────────────
# Quem está a falar connosco: o magic link por email, e a sessão.
#
# Não há palavras-passe. Entrar é pedir uma ligação, que vai para o
# email, e abri-la. Quem controla a caixa de correio é quem entra — é o
# segundo factor a fazer de primeiro, e é o que se quer para marcar uma
# reunião sem criar mais uma conta no mundo.
#
# A ligação é assinada, sem tabela — o mesmo desenho de
# `subscribers.link_for`/`read_link`: leva o email, o instante e um HMAC
# dos dois, e reiniciar o processo não a invalida. O que muda em relação
# à newsletter é que esta TEM de valer uma vez só (é como entrar, não
# como confirmar uma subscrição) — por isso `_used_links`, um registo
# leve em memória das assinaturas já gastas, do mesmo formato que
# `security._used_tokens`.
#
# A sessão em si continua uma assinatura, não uma tabela: o cookie leva
# o email, o prazo e um HMAC dos dois. O segredo tem de sobreviver a
# reinícios, senão um deploy deitava toda a gente fora — vem da
# configuração ou é gerado uma vez e guardado ao lado dos dados.
# ─────────────────────────────────────────────────────────────────────
import asyncio
import base64
import hashlib
import hmac
import re
import secrets
import time
from typing import Optional
from urllib.parse import urlencode

from app.config import AUTH, DATA_DIR, OWNER_EMAIL, SITE_ORIGIN

_secret: Optional[bytes] = None

# As assinaturas de ligações já usadas — só a assinatura, nunca o email
# em claro. Poucas, e morrem depressa (ver MAGIC_LINK_TTL).
_used_links: dict[str, float] = {}
MAX_USED_LINKS = 5000

_COOKIE_RE = None  # construído depois de AUTH.cookie ser conhecido


def _load_secret() -> bytes:
    if len(AUTH.secret) >= 16:
        return AUTH.secret.encode()
    secret_file = DATA_DIR / ".session-secret"
    try:
        saved = secret_file.read_text().strip()
        if len(saved) >= 32:
            return bytes.fromhex(saved)
    except OSError:
        pass
    fresh = secrets.token_bytes(32)
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    secret_file.write_text(fresh.hex())
    secret_file.chmod(0o600)
    print(f"[sessoes] segredo novo gerado em {secret_file}")
    return fresh


async def init_sessions() -> None:
    global _secret, _COOKIE_RE
    _secret = await asyncio.to_thread(_load_secret)
    _COOKIE_RE = re.compile(r"(?:^|;\s*)" + re.escape(AUTH.cookie) + r"=([A-Za-z0-9_.-]{1,400})")


def _hmac(value: str) -> str:
    assert _secret is not None
    return base64.urlsafe_b64encode(hmac.new(_secret, value.encode(), hashlib.sha256).digest()).decode().rstrip("=")


# ── O magic link ─────────────────────────────────────────────────────
def magic_link_for(email: str) -> str:
    """A ligação que entra. `SITE_ORIGIN` porque é o email que a lê, não
    o browser — precisa de ser um URL completo."""
    key = email.strip().lower()
    stamp = str(int(time.time() * 1000))
    query = urlencode(
        {
            "e": base64.urlsafe_b64encode(key.encode()).decode().rstrip("="),
            "t": stamp,
            "s": _hmac(f"magic.{key}.{stamp}"),
        }
    )
    return f"{SITE_ORIGIN}/api/auth/magic?{query}"


def verify_magic_link(params: dict) -> Optional[str]:
    """Confere a ligação e devolve o email — ou None. Uma vez só: a
    segunda tentativa com a mesma assinatura falha, mesmo dentro da
    janela de validade."""
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
    expected = _hmac(f"magic.{email}.{stamp}")
    if not hmac.compare_digest(given, expected):
        return None
    if (time.time() * 1000 - int(stamp)) > AUTH.magic_link_ttl * 1000:
        return None
    if given in _used_links:
        return None
    _used_links[given] = time.monotonic() + AUTH.magic_link_ttl
    if len(_used_links) > MAX_USED_LINKS:
        _used_links.pop(next(iter(_used_links)))
    return email


def sweep_magic_links() -> None:
    now = time.monotonic()
    for sig, exp in list(_used_links.items()):
        if exp < now:
            _used_links.pop(sig, None)


# ── A sessão ─────────────────────────────────────────────────────────
def _encode(email: str) -> str:
    return base64.urlsafe_b64encode(email.encode()).decode().rstrip("=")


def _cookie(value: str, max_age: int) -> str:
    secure = "; Secure" if SITE_ORIGIN.startswith("https:") else ""
    return f"{AUTH.cookie}={value}; Path=/api; HttpOnly; SameSite=Lax; Max-Age={max_age}{secure}"


def session_cookie(email: str) -> str:
    exp = str(int((time.time() + AUTH.session_ttl) * 1000))
    body = f"{_encode(email)}.{exp}"
    return _cookie(f"{body}.{_hmac('session.' + body)}", AUTH.session_ttl)


def clear_cookie() -> str:
    return _cookie("", 0)


def read_session(cookie_header: str) -> Optional[str]:
    """O email de quem faz o pedido, ou None."""
    if _secret is None or _COOKIE_RE is None:
        return None
    match = _COOKIE_RE.search(cookie_header)
    if not match:
        return None
    parts = match.group(1).split(".")
    if len(parts) != 3:
        return None
    encoded, exp, sig = parts
    if not hmac.compare_digest(sig, _hmac(f"session.{encoded}.{exp}")):
        return None
    if not (10 <= len(exp) <= 16 and exp.isdigit()) or int(exp) < time.time() * 1000:
        return None
    try:
        padded = encoded + "=" * (-len(encoded) % 4)
        email = base64.urlsafe_b64decode(padded).decode("utf-8")
    except (ValueError, UnicodeDecodeError):
        return None
    return email if email and len(email) <= 160 else None


def is_owner(email: Optional[str]) -> bool:
    """A sessão é a do dono do Calendário? Sem `OWNER_EMAIL` configurado,
    ninguém é — o Calendário fica só no modo de visitante."""
    return bool(OWNER_EMAIL) and bool(email) and email.strip().lower() == OWNER_EMAIL
