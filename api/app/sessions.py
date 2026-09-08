# ─────────────────────────────────────────────────────────────────────
# Quem está a falar connosco: o código por email, e a sessão.
#
# Não há palavras-passe. Entrar é pedir um código de seis algarismos,
# que vai para o email, e devolvê-lo. Quem controla a caixa de correio
# é quem entra — é o segundo factor a fazer de primeiro, e é o que se
# quer para marcar uma reunião sem criar mais uma conta no mundo.
#
# A sessão é uma assinatura, não uma tabela: o cookie leva o email, o
# prazo e um HMAC dos dois. O segredo tem de sobreviver a reinícios,
# senão um deploy deitava toda a gente fora — vem da configuração ou é
# gerado uma vez e guardado ao lado dos dados.
# ─────────────────────────────────────────────────────────────────────
import asyncio
import base64
import hashlib
import hmac
import re
import secrets
import time
from typing import Optional

from app.config import AUTH, DATA_DIR, LIMITS, OWNER_EMAIL, SITE_ORIGIN

_secret: Optional[bytes] = None

# Os códigos à espera de resposta, por email. Poucos, e morrem depressa.
_codes: dict[str, dict] = {}
MAX_CODES = 5000

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


# ── O código ─────────────────────────────────────────────────────────
def issue_code(email: str) -> str:
    """Gera um código para este email e guarda só a impressão dele."""
    code = f"{secrets.randbelow(1_000_000):06d}"
    _codes[email] = {"hash": _hmac(f"code.{email}.{code}"), "exp": time.monotonic() + AUTH.code_ttl, "tries": 0}
    if len(_codes) > MAX_CODES:
        _codes.pop(next(iter(_codes)))
    return code


def verify_code(email: str, code: str) -> bool:
    """Confere o código. Cada um vale uma vez, e poucas tentativas."""
    row = _codes.get(email)
    if not row:
        return False
    if row["exp"] < time.monotonic() or row["tries"] >= LIMITS.auth_tries:
        _codes.pop(email, None)
        return False
    row["tries"] += 1
    if not hmac.compare_digest(row["hash"], _hmac(f"code.{email}.{code}")):
        return False
    _codes.pop(email, None)
    return True


def sweep_codes() -> None:
    now = time.monotonic()
    for email, row in list(_codes.items()):
        if row["exp"] < now:
            _codes.pop(email, None)


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
