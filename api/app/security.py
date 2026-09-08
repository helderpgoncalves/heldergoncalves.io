# ─────────────────────────────────────────────────────────────────────
# O que protege a API: cabeçalhos, limites por visitante e o token que
# prova que um formulário esteve mesmo aberto.
#
# O segredo é gerado a cada arranque, de propósito: reiniciar invalida
# os tokens antigos. O único segredo que tem de sobreviver a reinícios
# é o da newsletter, e esse tem casa própria em subscribers.py.
# ─────────────────────────────────────────────────────────────────────
import hashlib
import hmac
import secrets
import time
from typing import Optional

from starlette.requests import Request

from app.config import LIMITS, TRUST_PROXY

SECURITY_HEADERS = {
    "Content-Security-Policy": "; ".join(
        [
            "default-src 'self'",
            "base-uri 'self'",
            "object-src 'none'",
            "frame-ancestors 'self'",
            "frame-src 'self'",
            "img-src 'self' data:",
            "style-src 'self' 'unsafe-inline'",
            "script-src 'self'",
            "connect-src 'self'",
            "font-src 'self'",
            "form-action 'self' mailto:",
            "manifest-src 'self'",
            "upgrade-insecure-requests",
        ]
    ),
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "SAMEORIGIN",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "Permissions-Policy": (
        "accelerometer=(), camera=(), microphone=(), geolocation=(), "
        "payment=(), usb=(), interest-cohort=()"
    ),
    "Cross-Origin-Opener-Policy": "same-origin",
    "Cross-Origin-Resource-Policy": "same-origin",
    "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
}

_SECRET = secrets.token_bytes(32)
_used_tokens: dict[str, float] = {}
_hits: dict[str, list[float]] = {}

# Um mapa de contagens sem tecto é uma fuga de memória à espera de um
# ataque distribuído: cada endereço novo é uma chave nova. Com tecto, o
# pior caso é conhecido — e quem é deitado fora primeiro é quem há mais
# tempo não aparece, que é exactamente quem já não estava a ser limitado.
MAX_KEYS = 20_000


def _evict_oldest(mapping: dict, keep: int) -> None:
    while len(mapping) > keep:
        mapping.pop(next(iter(mapping)))


def bump(key: str, window: float, limit: int) -> bool:
    """Conta uma ocorrência e diz se ainda cabe dentro do limite.

    Janela deslizante: guarda os instantes e deita fora os que já saíram.
    """
    now = time.monotonic()
    hits = [t for t in _hits.get(key, ()) if now - t < window]
    if len(hits) >= limit:
        _hits[key] = hits
        return False
    hits.append(now)
    _hits.pop(key, None)
    _hits[key] = hits
    if len(_hits) > MAX_KEYS:
        _evict_oldest(_hits, MAX_KEYS)
    return True


def sweep(global_window: float) -> None:
    """Limpeza periódica — chamada de fora, num agendador."""
    now = time.monotonic()
    for k in list(_hits.keys()):
        kept = [t for t in _hits[k] if now - t < global_window]
        if kept:
            _hits[k] = kept
        else:
            _hits.pop(k, None)
    for k, exp in list(_used_tokens.items()):
        if exp < now:
            _used_tokens.pop(k, None)


def _client_ip(request: Request) -> str:
    """O IP do visitante. Só confia no cabeçalho do proxy se lho dissermos."""
    if TRUST_PROXY:
        fwd = request.headers.get("x-forwarded-for")
        if fwd:
            return fwd.split(",")[0].strip()[:64]
    client = request.client
    return (client.host if client else "desconhecido")[:64]


def ip_key(request: Request) -> str:
    """Nunca guardamos o IP em claro — só uma impressão digital."""
    ip = _client_ip(request)
    return hmac.new(_SECRET, ip.encode(), hashlib.sha256).hexdigest()[:24]


def wrong_origin(request: Request, site_origin: str) -> Optional[str]:
    """O pedido vem mesmo do nosso site, e traz JSON?"""
    origin = request.headers.get("origin")
    if origin and origin != site_origin:
        return "origem"
    if "application/json" not in request.headers.get("content-type", ""):
        return "formato"
    return None


# ── Token do formulário ──────────────────────────────────────────────
# Prova três coisas ao mesmo tempo: que o formulário foi aberto neste
# servidor, que foi aberto por este visitante, e há quanto tempo. Um
# robô que faça POST directo não tem nenhuma delas.
#
# `stamp` é milissegundos como inteiro, nunca `str(time.time())`: um
# float impresso já traz um '.' na parte decimal, e o token tinha então
# sempre 4 pedaços ao dividir por '.', nunca os 3 que `check_token`
# espera — todo o token era rejeitado, sempre.
def issue_token(fingerprint: str) -> str:
    stamp = str(int(time.time() * 1000))
    nonce = secrets.token_urlsafe(9)
    sig = hmac.new(_SECRET, f"{stamp}.{nonce}.{fingerprint}".encode(), hashlib.sha256).hexdigest()
    return f"{stamp}.{nonce}.{sig}"


def check_token(
    token: Optional[str],
    fingerprint: str,
    min_age: Optional[float] = None,
    single_use: bool = True,
) -> Optional[str]:
    min_age = LIMITS.token_min_age if min_age is None else min_age
    if not isinstance(token, str) or len(token) > 200:
        return "token"
    parts = token.split(".")
    if len(parts) != 3:
        return "token"
    stamp, nonce, given = parts
    expected = hmac.new(_SECRET, f"{stamp}.{nonce}.{fingerprint}".encode(), hashlib.sha256).hexdigest()
    if not hmac.compare_digest(given, expected):
        return "token"
    try:
        age = time.time() - int(stamp) / 1000
    except ValueError:
        return "token"
    if age < 0:
        return "token"
    if age < min_age:
        return "rapido"
    if age > LIMITS.token_max_age:
        return "expirado"
    if single_use:
        if token in _used_tokens:
            return "repetido"
        _used_tokens[token] = time.monotonic() + LIMITS.token_max_age
        if len(_used_tokens) > MAX_KEYS:
            _evict_oldest(_used_tokens, MAX_KEYS)
    return None
