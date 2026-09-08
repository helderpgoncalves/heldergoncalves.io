# ─────────────────────────────────────────────────────────────────────
# Entrar com a Google — um segundo caminho para a mesma sessão do
# código por email. Chega a `session_cookie(email)` de forma diferente;
# a partir daí é indistinguível de quem entrou pelo código, para todo o
# resto da API — `is_owner`, `read_session`, tudo o resto continua igual.
#
#   GET /api/auth/google/start      redireciona para a Google
#   GET /api/auth/google/callback   a Google traz de volta, com um código
#
# Sem JWT nem biblioteca de OAuth: a troca do código por um token e o
# pedido dos dados da pessoa são dois pedidos HTTPS à própria Google,
# com o `httpx` que já é dependência. O `state` é o mesmo mecanismo dos
# tokens de formulário — HMAC, de uso único — porque é exactamente o
# mesmo problema: provar que este pedido começou aqui.
# ─────────────────────────────────────────────────────────────────────
from urllib.parse import urlencode

import httpx
from fastapi import APIRouter, Request
from starlette.responses import JSONResponse, RedirectResponse

from app.config import GOOGLE, GOOGLE_READY, GOOGLE_REDIRECT_URI, LIMITS, SITE_ORIGIN
from app.security import bump, check_token, ip_key, issue_token
from app.sessions import session_cookie

router = APIRouter()

AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"
TOKEN_URL = "https://oauth2.googleapis.com/token"
USERINFO_URL = "https://openidconnect.googleapis.com/v1/userinfo"


def _redirect_with_error(reason: str) -> RedirectResponse:
    """A pessoa volta ao site mesmo quando isto corre mal — nunca fica
    presa numa página de erro da API."""
    query = urlencode({"entrar": "erro", "motivo": reason})
    return RedirectResponse(SITE_ORIGIN + "/?" + query, status_code=302)


@router.get("/api/auth/google/start", response_model=None)
async def google_start(request: Request) -> RedirectResponse | JSONResponse:
    if not GOOGLE_READY:
        return JSONResponse({"ok": False, "error": "indisponivel"}, status_code=503)

    key = ip_key(request)
    if not bump("google:" + key, LIMITS.google_start_window, LIMITS.google_start_per_ip):
        return JSONResponse({"ok": False, "error": "limite"}, status_code=429)

    state = issue_token(key)
    query = urlencode(
        {
            "client_id": GOOGLE.client_id,
            "redirect_uri": GOOGLE_REDIRECT_URI,
            "response_type": "code",
            # Só o email — é só o que se usa. Pedir "profile" para o
            # deitar fora sem ler seria pedir mais do que o necessário.
            "scope": "openid email",
            "state": state,
            # Sem conta escolhida de propósito nenhuma vez: quem tem mais
            # do que uma conta Google aberta escolhe sempre, em vez de
            # entrar com a errada sem reparar.
            "prompt": "select_account",
        }
    )
    return RedirectResponse(AUTH_URL + "?" + query, status_code=302)


@router.get("/api/auth/google/callback")
async def google_callback(request: Request) -> RedirectResponse:
    if not GOOGLE_READY:
        return _redirect_with_error("indisponivel")

    key = ip_key(request)
    error = request.query_params.get("error")
    if error:
        return _redirect_with_error("cancelado")

    state = request.query_params.get("state", "")
    code = request.query_params.get("code", "")
    if check_token(state, key, min_age=0) is not None or not code:
        return _redirect_with_error("estado")

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            token_res = await client.post(
                TOKEN_URL,
                data={
                    "code": code,
                    "client_id": GOOGLE.client_id,
                    "client_secret": GOOGLE.client_secret,
                    "redirect_uri": GOOGLE_REDIRECT_URI,
                    "grant_type": "authorization_code",
                },
            )
            if token_res.status_code >= 300:
                return _redirect_with_error("token")
            access_token = token_res.json().get("access_token")
            if not access_token:
                return _redirect_with_error("token")

            info_res = await client.get(USERINFO_URL, headers={"Authorization": "Bearer " + access_token})
            if info_res.status_code >= 300:
                return _redirect_with_error("perfil")
            info = info_res.json()
    except httpx.HTTPError:
        return _redirect_with_error("rede")

    email = str(info.get("email") or "").strip().lower()
    # A Google já verificou a caixa de correio antes de a pessoa poder
    # usá-la para entrar noutro lado — é a mesma garantia que o código
    # por email dá, só que a fazer o trabalho a própria Google.
    if not email or not info.get("email_verified"):
        return _redirect_with_error("email")

    print("[sessoes] sessão iniciada (Google)")
    response = RedirectResponse(SITE_ORIGIN + "/?entrar=ok", status_code=302)
    response.headers["Set-Cookie"] = session_cookie(email)
    return response
