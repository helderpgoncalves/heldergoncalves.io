# ─────────────────────────────────────────────────────────────────────
# Entrar: um código por email, e a sessão.
#
#   POST /api/auth/start    pede o código (email + token do formulário)
#   POST /api/auth/verify   devolve o código, recebe o cookie de sessão
#   GET  /api/auth/me       quem sou
#   POST /api/auth/logout   sair
#
# A resposta ao `start` é a mesma quer o email exista quer não — não
# existe "conta", existe uma caixa de correio, e é ela que prova quem é
# quem.
# ─────────────────────────────────────────────────────────────────────
from fastapi import APIRouter, Request
from starlette.responses import JSONResponse

from app.config import AUTH_READY, LIMITS, SITE_ORIGIN
from app.copy import AUTH_COPY, pick_lang
from app.http import read_json
from app.mail import send_mail
from app.security import bump, check_token, ip_key, wrong_origin
from app.sessions import clear_cookie, is_owner, issue_code, read_session, session_cookie, verify_code
from app.validation import EMAIL_RE, clean, one_line

router = APIRouter()


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

    code = issue_code(email)
    sent = await send_mail(to=email, subject=copy["subject"], text=copy["body"](code))
    if not sent:
        return JSONResponse({"ok": False, "error": "entrega"}, status_code=502)
    print("[sessoes] código enviado")
    return JSONResponse({"ok": True})


@router.post("/api/auth/verify")
async def auth_verify(request: Request) -> JSONResponse:
    if not AUTH_READY:
        return JSONResponse({"ok": False, "error": "indisponivel"}, status_code=503)
    bad = wrong_origin(request, SITE_ORIGIN)
    if bad:
        return JSONResponse({"ok": False, "error": bad}, status_code=403 if bad == "origem" else 415)

    key = ip_key(request)
    if not bump("verify:" + key, LIMITS.auth_verify_window, LIMITS.auth_verify_per_ip):
        return JSONResponse({"ok": False, "error": "limite"}, status_code=429)

    payload = await read_json(request)
    if payload is None:
        return JSONResponse({"ok": False, "error": "corpo"}, status_code=400)
    email = one_line(payload.get("email"), LIMITS.email).lower()
    code = one_line(payload.get("code"), 12).replace(" ", "")
    if not EMAIL_RE.match(email) or not (len(code) == 6 and code.isdigit()):
        return JSONResponse({"ok": False, "error": "codigo"}, status_code=400)

    if not verify_code(email, code):
        return JSONResponse({"ok": False, "error": "codigo"}, status_code=400)
    print("[sessoes] sessão iniciada")
    response = JSONResponse({"ok": True, "email": email, "owner": is_owner(email)})
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
