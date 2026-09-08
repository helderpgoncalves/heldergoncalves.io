# ─────────────────────────────────────────────────────────────────────
# A mensagem de contacto.
#
# Quatro coisas têm de estar certas antes de sair um email: a origem, o
# token do formulário, a armadilha por preencher, e os limites por
# visitante. Se o email não estiver configurado, o site volta ao
# `mailto:` e não se perde nada.
# ─────────────────────────────────────────────────────────────────────
from fastapi import APIRouter, Request
from starlette.responses import JSONResponse

from app.config import LIMITS, MAIL_READY, SITE_ORIGIN
from app.http import read_json
from app.mail import deliver_to_owner
from app.security import bump, check_token, ip_key, wrong_origin
from app.validation import EMAIL_RE, clean, one_line

router = APIRouter()


@router.post("/api/contact")
async def contact(request: Request) -> JSONResponse:
    if not MAIL_READY:
        return JSONResponse({"ok": False, "error": "indisponivel"}, status_code=503)

    bad = wrong_origin(request, SITE_ORIGIN)
    if bad:
        return JSONResponse({"ok": False, "error": bad}, status_code=403 if bad == "origem" else 415)

    key = ip_key(request)
    if not bump("msg:" + key, LIMITS.per_ip_window, LIMITS.per_ip):
        return JSONResponse({"ok": False, "error": "limite"}, status_code=429)
    if not bump("msg:global", LIMITS.global_window, LIMITS.global_):
        return JSONResponse({"ok": False, "error": "limite"}, status_code=429)

    payload = await read_json(request)
    if payload is None:
        return JSONResponse({"ok": False, "error": "corpo"}, status_code=400)

    # Armadilha: campo invisível que só um robô preenche. Responde "ok"
    # para o robô não perceber que foi apanhado — e não envia nada.
    if clean(payload.get("company"), 200):
        return JSONResponse({"ok": True})

    token_error = check_token(payload.get("token"), key, min_age=LIMITS.token_min_age)
    if token_error:
        return JSONResponse({"ok": False, "error": token_error}, status_code=400)

    from_ = one_line(payload.get("from"), LIMITS.email)
    subject = one_line(payload.get("subject"), LIMITS.subject) or "Mensagem do site"
    message = clean(payload.get("message"), LIMITS.message)
    if not EMAIL_RE.match(from_):
        return JSONResponse({"ok": False, "error": "email"}, status_code=400)
    if len(message) < 10:
        return JSONResponse({"ok": False, "error": "curto"}, status_code=400)

    sent = await deliver_to_owner(from_, subject, message)
    if not sent:
        return JSONResponse({"ok": False, "error": "entrega"}, status_code=502)
    print("[contacto] mensagem entregue")
    return JSONResponse({"ok": True})
