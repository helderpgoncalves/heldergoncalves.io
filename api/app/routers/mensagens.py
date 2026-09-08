# ─────────────────────────────────────────────────────────────────────
# As conversas das Mensagens — só o dono.
#
#   GET /api/mensagens              uma linha por conversa, mais recente primeiro
#   GET /api/mensagens/{conversa}   as mensagens dessa conversa, mais antigas primeiro
# ─────────────────────────────────────────────────────────────────────
from fastapi import APIRouter, Request
from starlette.responses import JSONResponse

from app.chat_store import conversations, transcript
from app.owner_guard import require_owner

router = APIRouter()


@router.get("/api/mensagens")
async def mensagens(request: Request) -> JSONResponse:
    _, error = require_owner(request)
    if error:
        return error
    return JSONResponse({"ok": True, "conversations": conversations()})


@router.get("/api/mensagens/{conversa}")
async def mensagens_conversa(request: Request, conversa: str) -> JSONResponse:
    _, error = require_owner(request)
    if error:
        return error
    turns = transcript(conversa)
    if not turns:
        return JSONResponse({"ok": False, "error": "inexistente"}, status_code=404)
    return JSONResponse({"ok": True, "turns": turns})
