# ─────────────────────────────────────────────────────────────────────
# A mensagem de contacto.
#
# Pede sessão, e o remetente é o email da sessão — nunca um campo do
# formulário. É a mesma decisão dos comentários: quem escreve ao Hélder
# escreve com o email que provou ser seu, e ninguém assina como outra
# pessoa. Sem sessão, o site volta ao `mailto:`, e aí quem prova o email
# é o cliente de correio de quem escreve.
#
# Quatro coisas continuam a ter de estar certas antes de sair um email:
# a origem, o token do formulário, a armadilha por preencher, e os
# limites por visitante.
# ─────────────────────────────────────────────────────────────────────
from fastapi import APIRouter, Request
from starlette.responses import JSONResponse

from app.config import LIMITS, MAIL_READY, SITE_ORIGIN
from app.http import read_json
from app.mail import deliver_to_owner
from app.security import bump, check_token, ip_key, wrong_origin
from app.sessions import is_owner, read_session
from app.validation import clean, one_line

router = APIRouter()


@router.post("/api/contact")
async def contact(request: Request) -> JSONResponse:
    if not MAIL_READY:
        return JSONResponse({"ok": False, "error": "indisponivel"}, status_code=503)

    session_email = read_session(request.headers.get("cookie", ""))
    if not session_email:
        return JSONResponse({"ok": False, "error": "sessao"}, status_code=401)
    # Escrever a si próprio não é uma mensagem, é uma nota — e para
    # notas há o Blog. Do lado do dono o Mail é a caixa de entrada.
    if is_owner(session_email):
        return JSONResponse({"ok": False, "error": "proprio"}, status_code=403)

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

    # O `from` que vinha no corpo deixou de ser lido: o remetente é
    # sempre a sessão. Continuar a aceitá-lo era deixar qualquer pessoa
    # — com sessão ou sem ela — assinar com o email de outra.
    subject = one_line(payload.get("subject"), LIMITS.subject) or "Mensagem do site"
    message = clean(payload.get("message"), LIMITS.message)
    if len(message) < 10:
        return JSONResponse({"ok": False, "error": "curto"}, status_code=400)

    sent = await deliver_to_owner(session_email, subject, message)
    if not sent:
        return JSONResponse({"ok": False, "error": "entrega"}, status_code=502)
    print("[contacto] mensagem entregue")
    return JSONResponse({"ok": True})
