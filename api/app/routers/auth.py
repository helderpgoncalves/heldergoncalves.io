# ─────────────────────────────────────────────────────────────────────
# Entrar: um magic link por email, e a sessão.
#
#   POST /api/auth/start    pede a ligação (email + token do formulário)
#   GET  /api/auth/magic    a ligação em si — confirma e cria a sessão
#   GET  /api/auth/me       quem sou
#   POST /api/auth/logout   sair
#
# A resposta ao `start` é a mesma quer o email exista quer não — não
# existe "conta", existe uma caixa de correio, e é ela que prova quem é
# quem.
# ─────────────────────────────────────────────────────────────────────
from urllib.parse import urlencode

from fastapi import APIRouter, Request
from starlette.responses import JSONResponse, RedirectResponse

from app.config import AUTH_READY, LIMITS, SITE_ORIGIN
from app.copy import AUTH_COPY, pick_lang
from app.http import read_json
from app.mail import send_mail
from app.security import bump, check_token, ip_key, wrong_origin
from app.sessions import clear_cookie, is_owner, magic_link_for, read_session, session_cookie, verify_magic_link
from app.users_repo import record_visit
from app.validation import EMAIL_RE, clean, one_line

router = APIRouter()


def _redirect_with_error(reason: str) -> RedirectResponse:
    """A pessoa volta ao site mesmo quando isto corre mal — o mesmo
    princípio do callback da Google (`oauth_google.py`): nunca presa
    numa página de erro da API."""
    query = urlencode({"entrar": "erro", "motivo": reason})
    return RedirectResponse(SITE_ORIGIN + "/?" + query, status_code=302)


@router.post("/api/auth/start")
async def auth_start(request: Request) -> JSONResponse:
    if not AUTH_READY:
        return JSONResponse({"ok": False, "error": "indisponivel"}, status_code=503)

    bad = wrong_origin(request, SITE_ORIGIN)
    if bad:
        return JSONResponse({"ok": False, "error": bad}, status_code=403 if bad == "origem" else 415)

    key = ip_key(request)
    if not bump("auth:" + key, LIMITS.auth_per_ip_window, LIMITS.auth_per_ip):
        return JSONResponse({"ok": False, "error": "limite"}, status_code=429)
    if not bump("auth:global", LIMITS.auth_global_window, LIMITS.auth_global):
        return JSONResponse({"ok": False, "error": "limite"}, status_code=429)

    payload = await read_json(request)
    if payload is None:
        return JSONResponse({"ok": False, "error": "corpo"}, status_code=400)
    if clean(payload.get("company"), 200):
        return JSONResponse({"ok": True})

    token_error = check_token(payload.get("token"), key, min_age=LIMITS.sub_token_min_age)
    if token_error:
        return JSONResponse({"ok": False, "error": token_error}, status_code=400)

    email = one_line(payload.get("email"), LIMITS.email).lower()
    if not EMAIL_RE.match(email):
        return JSONResponse({"ok": False, "error": "email"}, status_code=400)
    copy = AUTH_COPY[pick_lang(payload.get("lang"))]

    sent = await send_mail(to=email, subject=copy["subject"], text=copy["body"](magic_link_for(email)))
    if not sent:
        return JSONResponse({"ok": False, "error": "entrega"}, status_code=502)
    print("[sessoes] ligação enviada")
    return JSONResponse({"ok": True})


@router.get("/api/auth/magic", response_model=None)
async def auth_magic(request: Request) -> RedirectResponse:
    if not AUTH_READY:
        return _redirect_with_error("indisponivel")

    key = ip_key(request)
    if not bump("magic:" + key, LIMITS.magic_verify_window, LIMITS.magic_verify_per_ip):
        return _redirect_with_error("limite")

    email = verify_magic_link(dict(request.query_params))
    if not email:
        return _redirect_with_error("ligacao")

    print("[sessoes] sessão iniciada")
    await record_visit(email)
    response = RedirectResponse(SITE_ORIGIN + "/?entrar=ok", status_code=302)
    response.headers["Set-Cookie"] = session_cookie(email)
    return response


@router.get("/api/auth/me")
async def auth_me(request: Request) -> JSONResponse:
    email = read_session(request.headers.get("cookie", ""))
    if not email:
        return JSONResponse({"ok": False, "error": "sessao", "enabled": AUTH_READY}, status_code=401)
    return JSONResponse({"ok": True, "email": email, "enabled": AUTH_READY, "owner": is_owner(email)})


@router.post("/api/auth/logout")
async def auth_logout() -> JSONResponse:
    response = JSONResponse({"ok": True})
    response.headers["Set-Cookie"] = clear_cookie()
    return response
