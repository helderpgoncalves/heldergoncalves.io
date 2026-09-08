# ─────────────────────────────────────────────────────────────────────
# A caixa de entrada das Mensagens — só do dono.
#
#   GET /api/mensagens                a lista de conversas, mais recente primeiro
#   GET /api/mensagens/{conversa}     uma conversa, do início ao fim
#
# É a excepção ao resto do site: aqui há mesmo texto de visitantes
# guardado (ver `chat_store.py`). Existe porque foi pedido explicitamente
# — e só o dono a lê.
# ─────────────────────────────────────────────────────────────────────
from urllib.parse import unquote

from fastapi import APIRouter, Request
from starlette.responses import JSONResponse

from app.chat_store import conversations, transcript
from app.owner_guard import require_owner

router = APIRouter()


@router.get("/api/mensagens")
async def inbox(request: Request) -> JSONResponse:
    _, error = require_owner(request)
    if error:
        return error
    return JSONResponse({"ok": True, "conversations": conversations()})


@router.get("/api/mensagens/{conversa}")
async def inbox_thread(request: Request, conversa: str) -> JSONResponse:
    _, error = require_owner(request)
    if error:
        return error
    turns = transcript(unquote(conversa))
    if not turns:
        return JSONResponse({"ok": False, "error": "inexistente"}, status_code=404)
    return JSONResponse({"ok": True, "turns": turns})
