# ─────────────────────────────────────────────────────────────────────
# O token que os formulários pedem ao abrir. Diz também o que está
# ligado, para o site saber se mostra o formulário ou o `mailto:`.
# ─────────────────────────────────────────────────────────────────────
from fastapi import APIRouter, Request
from starlette.responses import JSONResponse

from app.config import CHAT_READY, LIMITS, MAIL_READY, NEWSLETTER_READY
from app.security import bump, ip_key, issue_token

router = APIRouter()


@router.get("/api/token")
async def token(request: Request) -> JSONResponse:
    key = ip_key(request)
    if not bump("tok:" + key, LIMITS.token_window, LIMITS.token_per_ip):
        return JSONResponse({"ok": False, "error": "limite"}, status_code=429)
    return JSONResponse(
        {
            "ok": True,
            "enabled": MAIL_READY,
            "chat": CHAT_READY,
            "subscribe": NEWSLETTER_READY,
            "token": issue_token(key),
        }
    )
