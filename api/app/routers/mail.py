# ─────────────────────────────────────────────────────────────────────
# A caixa de entrada da Mail — só do dono.
#
#   GET  /api/mail                 uma linha por pessoa que escreveu
#   GET  /api/mail/{conversa}      as mensagens dessa pessoa
#   POST /api/mail/rascunho        redige uma resposta, não a envia
#   POST /api/mail/responder       envia a resposta, e guarda-a
#
# Do lado do visitante a Mail continua a ser a folha de escrever de
# sempre (`routers/contact.py`); do lado do dono é isto. As quatro rotas
# começam por `require_owner` — e por isso não têm armadilha nem token
# de formulário: não há robô com a sessão do dono. Ficam os portões de
# origem e de limites, como em `routers/escritos.py`.
#
# O rascunho é um rascunho: sai daqui como texto para o dono ler e
# corrigir no compositor, e nunca se envia sozinho. Quem envia é
# `/api/mail/responder`, com o dono a carregar no botão.
# ─────────────────────────────────────────────────────────────────────
from urllib.parse import unquote

import httpx
from fastapi import APIRouter, Request
from starlette.responses import JSONResponse

from app.agent.modelo import call_model
from app.agent.rascunho import Pedido, draft_messages
from app.config import CHAT_READY, LIMITS, MAIL, MAIL_READY, SITE_ORIGIN
from app.contacto_store import DONO, conversations, email_of, record_message, transcript
from app.http import read_json
from app.mail import send_mail
from app.owner_guard import require_owner
from app.security import bump, ip_key, wrong_origin
from app.validation import clean, one_line

router = APIRouter()


def _gate(request: Request, window: int, ceiling: int):
    """Os portões comuns às quatro rotas: dono, origem (só quando se
    recebe alguma coisa), e o limite da rota. `None` quando está tudo
    bem — senão a resposta de erro, pronta a devolver."""
    _, error = require_owner(request)
    if error:
        return error
    if request.method == "POST":
        bad = wrong_origin(request, SITE_ORIGIN)
        if bad:
            return JSONResponse({"ok": False, "error": bad}, status_code=403 if bad == "origem" else 415)
    if not bump("mail:" + ip_key(request), window, ceiling):
        return JSONResponse({"ok": False, "error": "limite"}, status_code=429)
    return None


def _conversa_pedida(payload: dict) -> str:
    """O id da conversa que vem do corpo. É um `email:<endereço>` — o
    tecto é o do email com folga para o prefixo."""
    return one_line(payload.get("conversa"), LIMITS.email + 8)


@router.get("/api/mail")
async def caixa(request: Request) -> JSONResponse:
    error = _gate(request, LIMITS.mail_window, LIMITS.mail_per_ip)
    if error:
        return error
    return JSONResponse({"ok": True, "conversations": conversations()})


@router.get("/api/mail/{conversa}")
async def conversa(request: Request, conversa: str) -> JSONResponse:
    error = _gate(request, LIMITS.mail_window, LIMITS.mail_per_ip)
    if error:
        return error
    messages = transcript(unquote(conversa))
    if not messages:
        return JSONResponse({"ok": False, "error": "inexistente"}, status_code=404)
    return JSONResponse({"ok": True, "messages": messages})


@router.post("/api/mail/rascunho")
async def rascunho(request: Request) -> JSONResponse:
    error = _gate(request, LIMITS.mail_draft_window, LIMITS.mail_draft_per_ip)
    if error:
        return error
    # Sem modelo configurado não há rascunho — e a app mostra o
    # compositor vazio, que continua a servir para responder à mão. O
    # portão do dono vem antes deste, como em `routers/escritos.py`:
    # quem não é dono não fica a saber o que está ou não configurado.
    if not CHAT_READY:
        return JSONResponse({"ok": False, "error": "indisponivel"}, status_code=503)

    payload = await read_json(request)
    if payload is None:
        return JSONResponse({"ok": False, "error": "corpo"}, status_code=400)

    conv_id = _conversa_pedida(payload)
    messages = transcript(conv_id)
    if not messages:
        return JSONResponse({"ok": False, "error": "inexistente"}, status_code=404)

    # O assunto e o destinatário saem do que está guardado, nunca do
    # corpo do pedido: quem responde escolhe uma conversa, não um
    # destino.
    ultimo = messages[-1]
    pedido = Pedido(email=email_of(conv_id), subject=str(ultimo.get("subject") or ""), turns=messages)

    try:
        reply = await call_model(draft_messages(pedido), LIMITS.mail_draft_tokens)
    except (httpx.HTTPError, RuntimeError) as err:
        print(f"[mail] rascunho falhou: {err}")
        return JSONResponse({"ok": False, "error": "upstream"}, status_code=502)

    text = clean(reply.get("content"), LIMITS.message)
    if not text:
        return JSONResponse({"ok": False, "error": "vazio"}, status_code=502)
    print("[mail] rascunho redigido")
    return JSONResponse({"ok": True, "text": text})


@router.post("/api/mail/responder")
async def responder(request: Request) -> JSONResponse:
    error = _gate(request, LIMITS.mail_reply_window, LIMITS.mail_reply_per_ip)
    if error:
        return error
    if not MAIL_READY:
        return JSONResponse({"ok": False, "error": "indisponivel"}, status_code=503)

    payload = await read_json(request)
    if payload is None:
        return JSONResponse({"ok": False, "error": "corpo"}, status_code=400)

    conv_id = _conversa_pedida(payload)
    messages = transcript(conv_id)
    if not messages:
        return JSONResponse({"ok": False, "error": "inexistente"}, status_code=404)

    para = email_of(conv_id)
    if not para:
        return JSONResponse({"ok": False, "error": "inexistente"}, status_code=404)

    subject = one_line(payload.get("subject"), LIMITS.subject) or str(messages[-1].get("subject") or "")
    text = clean(payload.get("message"), LIMITS.message)
    if len(text) < 10:
        return JSONResponse({"ok": False, "error": "curto"}, status_code=400)

    # `reply_to` é a caixa do Hélder: a resposta sai do endereço do site,
    # mas quem carregar em «responder» no cliente de correio escreve-lhe
    # a ele, não a um endereço que ninguém lê.
    sent = await send_mail(subject=subject, text=text, to=para, reply_to=MAIL.to)
    if not sent:
        return JSONResponse({"ok": False, "error": "entrega"}, status_code=502)

    # Guardar é um passo a mais, nunca em vez de enviar: o email já saiu,
    # e uma falha a escrever no disco não pode transformar isso num erro.
    try:
        await record_message(conv_id, para, DONO, subject, text)
    except OSError as err:
        print(f"[mail] resposta enviada mas nao guardada: {err}")
    print("[mail] resposta enviada")
    return JSONResponse({"ok": True})
