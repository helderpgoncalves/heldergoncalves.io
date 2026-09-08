# ─────────────────────────────────────────────────────────────────────
# Subscrever o blog.
#
# Dupla confirmação, que é a única forma honesta de fazer isto: pedir a
# subscrição não põe ninguém na lista, só manda um email com uma
# ligação. Quem não carregar na ligação nunca recebe nada — e quem
# escrever o email de outra pessoa não a inscreve.
#
# Três endpoints:
#   POST /api/subscribe              pede, e manda o email
#   GET  /api/subscribe/confirm      entra mesmo na lista
#   GET  /api/subscribe/unsubscribe  sai da lista, e nunca expira
#
# A resposta ao POST é sempre a mesma quer o email já esteja na lista
# quer não: dizer "esse já cá está" seria contar a um estranho quem
# subscreveu.
# ─────────────────────────────────────────────────────────────────────
from fastapi import APIRouter, Request
from starlette.responses import HTMLResponse, JSONResponse

from app.config import LIMITS, NEWSLETTER_READY, SITE_ORIGIN
from app.copy import NEWSLETTER_COPY, pick_lang
from app.http import read_json
from app.mail import send_mail
from app.security import bump, check_token, ip_key, wrong_origin
from app.subscribers import link_for, mark_active, mark_gone, mark_pending, read_link, status_of
from app.validation import EMAIL_RE, clean, escape_html, one_line

router = APIRouter()


def _page(status: int, copy: dict, title: str, body: str) -> HTMLResponse:
    """Uma página inteira, sem depender de nada do site."""
    html = (
        f'<!doctype html><html lang="{copy["lang"]}"><head><meta charset="utf-8">'
        '<meta name="viewport" content="width=device-width,initial-scale=1">'
        '<meta name="robots" content="noindex">'
        f"<title>{escape_html(title)}</title><style>"
        "body{margin:0;min-height:100vh;display:grid;place-items:center;padding:24px;"
        'font:17px/1.5 -apple-system,BlinkMacSystemFont,"SF Pro Text",system-ui,sans-serif;'
        "color:#1d1d1f;background:#fff}"
        "main{max-width:34rem;text-align:center}"
        "h1{font-size:28px;letter-spacing:-.02em;margin:0 0 8px}"
        "p{margin:0 0 24px;color:#8e8e93}"
        "a{display:inline-block;padding:11px 22px;border-radius:999px;background:#007aff;color:#fff;"
        "text-decoration:none;font-weight:500}"
        "@media(prefers-color-scheme:dark){body{background:#1c1c1e;color:#f5f5f7}a{background:#0a84ff}}"
        f'</style></head><body><main><h1>{escape_html(title)}</h1><p>{escape_html(body)}</p>'
        f'<a href="{SITE_ORIGIN}">{escape_html(copy["back"])}</a></main></body></html>'
    )
    return HTMLResponse(html, status_code=status, headers={"Cache-Control": "no-store"})


@router.post("/api/subscribe")
async def subscribe(request: Request) -> JSONResponse:
    if not NEWSLETTER_READY:
        return JSONResponse({"ok": False, "error": "indisponivel"}, status_code=503)

    bad = wrong_origin(request, SITE_ORIGIN)
    if bad:
        return JSONResponse({"ok": False, "error": bad}, status_code=403 if bad == "origem" else 415)

    key = ip_key(request)
    if not bump("sub:" + key, LIMITS.sub_per_ip_window, LIMITS.sub_per_ip):
        return JSONResponse({"ok": False, "error": "limite"}, status_code=429)
    if not bump("sub:global", LIMITS.sub_global_window, LIMITS.sub_global):
        return JSONResponse({"ok": False, "error": "limite"}, status_code=429)

    payload = await read_json(request)
    if payload is None:
        return JSONResponse({"ok": False, "error": "corpo"}, status_code=400)

    # Armadilha: campo invisível que só um robô preenche.
    if clean(payload.get("company"), 200):
        return JSONResponse({"ok": True})

    token_error = check_token(payload.get("token"), key, min_age=LIMITS.sub_token_min_age)
    if token_error:
        return JSONResponse({"ok": False, "error": token_error}, status_code=400)

    email = one_line(payload.get("email"), LIMITS.email).lower()
    if not EMAIL_RE.match(email):
        return JSONResponse({"ok": False, "error": "email"}, status_code=400)

    lang = pick_lang(payload.get("lang"))
    copy = NEWSLETTER_COPY[lang]

    # Já confirmado: não se manda nada, e responde-se como se tivesse
    # corrido bem. Quem está na lista sabe que está.
    if status_of(email) == "active":
        return JSONResponse({"ok": True})

    await mark_pending(email, lang)
    sent = await send_mail(
        to=email,
        subject=copy["confirmSubject"],
        text=copy["confirmBody"](link_for(SITE_ORIGIN, "confirm", email), link_for(SITE_ORIGIN, "unsubscribe", email)),
    )
    if not sent:
        return JSONResponse({"ok": False, "error": "entrega"}, status_code=502)
    print("[newsletter] pedido de confirmação enviado")
    return JSONResponse({"ok": True})


@router.get("/api/subscribe/confirm")
async def confirm(request: Request) -> HTMLResponse:
    copy = NEWSLETTER_COPY[pick_lang(request.query_params.get("lang"))]
    email = read_link("confirm", request.query_params)
    if not email:
        return _page(400, copy, copy["badTitle"], copy["badBody"])
    if not await mark_active(email):
        return _page(400, copy, copy["badTitle"], copy["badBody"])
    print("[newsletter] subscrição confirmada")
    return _page(200, copy, copy["okTitle"], copy["okBody"])


@router.get("/api/subscribe/unsubscribe")
async def unsubscribe(request: Request) -> HTMLResponse:
    copy = NEWSLETTER_COPY[pick_lang(request.query_params.get("lang"))]
    email = read_link("unsubscribe", request.query_params)
    if not email:
        return _page(400, copy, copy["badTitle"], copy["badBody"])
    await mark_gone(email)
    print("[newsletter] subscrição cancelada")
    return _page(200, copy, copy["goneTitle"], copy["goneBody"])
