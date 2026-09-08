# ─────────────────────────────────────────────────────────────────────
# Quem já entrou no site — só o dono.
#
#   GET /api/pessoas    email, por onde entrou, primeira e última vez
# ─────────────────────────────────────────────────────────────────────
from fastapi import APIRouter, Request
from starlette.responses import JSONResponse

from app.owner_guard import require_owner
from app.users_store import list_people

router = APIRouter()


@router.get("/api/pessoas")
async def pessoas(request: Request) -> JSONResponse:
    _, error = require_owner(request)
    if error:
        return error
    return JSONResponse({"ok": True, "people": list_people()})
