# ─────────────────────────────────────────────────────────────────────
# O portão que todo o endpoint só-do-dono começa por passar.
#
# Três coisas, pela ordem: a sessão está ligada (`AUTH_READY`), há uma
# sessão, e é a do dono (`is_owner`). Um só sítio a decidir isto é o que
# evita um endpoint novo esquecer-se de um dos três.
# ─────────────────────────────────────────────────────────────────────
from typing import Optional

from starlette.requests import Request
from starlette.responses import JSONResponse

from app.config import AUTH_READY
from app.sessions import is_owner, read_session


def require_owner(request: Request) -> tuple[Optional[str], Optional[JSONResponse]]:
    """O email da sessão, se for a do dono — ou uma resposta de erro
    pronta a devolver. Nunca as duas coisas."""
    if not AUTH_READY:
        return None, JSONResponse({"ok": False, "error": "indisponivel"}, status_code=503)
    email = read_session(request.headers.get("cookie", ""))
    if not email:
        return None, JSONResponse({"ok": False, "error": "sessao"}, status_code=401)
    if not is_owner(email):
        return None, JSONResponse({"ok": False, "error": "dono"}, status_code=403)
    return email, None
