# ─────────────────────────────────────────────────────────────────────
# A saúde do container.
#
# Um healthcheck que devolve sempre `ok` porque o processo está vivo não
# serve para nada: um processo pode estar vivo e a devolver 404 a tudo,
# se a pasta do site não estiver onde devia. Este confirma o que
# interessa mesmo — que há um `index.html` para servir — e é isso que
# torna um deploy falhado num rollback em vez de num site em branco.
#
# A verificação fica em cache durante dez segundos, porque a alternativa
# era um `stat` a cada trinta segundos para responder a uma pergunta que
# muda uma vez por deploy.
# ─────────────────────────────────────────────────────────────────────
import time

from fastapi import APIRouter
from starlette.responses import PlainTextResponse

from app.config import ROOT

router = APIRouter()

MEMO = 10.0
_ready = False
_checked_at = 0.0


def _is_ready() -> bool:
    global _ready, _checked_at
    now = time.monotonic()
    if now - _checked_at < MEMO:
        return _ready
    _checked_at = now
    _ready = (ROOT / "index.html").is_file()
    return _ready


def prime_health() -> bool:
    """Chamado no arranque, para o primeiro healthcheck não esperar por I/O."""
    ok = _is_ready()
    if not ok:
        print(f"saúde:      sem index.html em {ROOT} — o container vai ficar unhealthy")
    return ok


@router.api_route("/healthz", methods=["GET", "HEAD"])
async def healthz() -> PlainTextResponse:
    ok = _is_ready()
    body = "ok" if ok else "no"
    return PlainTextResponse(body, status_code=200 if ok else 503, headers={"Cache-Control": "no-store"})
