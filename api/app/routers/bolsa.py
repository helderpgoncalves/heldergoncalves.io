# ─────────────────────────────────────────────────────────────────────
# A Bolsa: cotações ao vivo.
#
# Ao contrário do antigo servidor Node, que falava com esta API por HTTP
# numa rede interna, agora corre no mesmo processo — o `yfinance` é
# bloqueante, por isso cada chamada vai para um thread à parte
# (`asyncio.to_thread`) para não travar o resto da API enquanto espera
# pelo Yahoo.
#
#   GET /api/bolsa?s=AAPL,MSFT&r=1d   as cotações e a série de cada um
#   GET /api/bolsa/detalhe?s=AAPL     estatísticas, perfil e notícias
#   GET /api/bolsa/procurar?q=apple   símbolos por nome ou sigla
#
# Nada do que vem de fora entra sem ser conferido: os símbolos têm uma
# forma fixa, o intervalo é de uma lista, e o que se devolve ao browser
# é só o que a aplicação usa.
# ─────────────────────────────────────────────────────────────────────
import asyncio
import re
import time

from fastapi import APIRouter, Request
from starlette.responses import JSONResponse

from app.bolsa.client import RANGES, chart_for, details_for, quotes_for, search_for
from app.config import LIMITS
from app.security import bump, ip_key
from app.validation import one_line

router = APIRouter()

# O primeiro carácter também pode ser '^': é assim que o Yahoo escreve um
# índice — '^GSPC' é o S&P 500, e está na lista por omissão.
SYMBOL_RE = re.compile(r"^[A-Z0-9^][A-Z0-9.=^-]{0,11}$")


def _range_of(request: Request) -> str:
    r = request.query_params.get("r") or "1d"
    return r if r in RANGES else "1d"


def _symbols_of(raw: str) -> list[str]:
    seen: list[str] = []
    for part in raw.upper().split(","):
        s = part.strip()
        if s and SYMBOL_RE.match(s) and s not in seen:
            seen.append(s)
    return seen[: LIMITS.stocks_per_request]


def _within_limits(request: Request, name: str, window: float, limit: int) -> bool:
    key = ip_key(request)
    if not bump(f"{name}:{key}", window, limit):
        return False
    return bump(f"{name}:global", LIMITS.stocks_global_window, LIMITS.stocks_global)


@router.get("/api/bolsa")
async def bolsa(request: Request) -> JSONResponse:
    if not _within_limits(request, "bolsa", LIMITS.stocks_per_ip_window, LIMITS.stocks_per_ip):
        return JSONResponse({"ok": False, "error": "limite"}, status_code=429)

    range_ = _range_of(request)
    symbols = _symbols_of(request.query_params.get("s", ""))
    if not symbols:
        return JSONResponse({"ok": False, "error": "simbolos"}, status_code=400)

    if range_ == "1d":
        quotes = await asyncio.to_thread(quotes_for, symbols)
    else:
        results = await asyncio.gather(*(asyncio.to_thread(chart_for, s, range_) for s in symbols))
        quotes = [q for q in results if q]

    return JSONResponse({"ok": True, "range": range_, "at": int(time.time() * 1000), "source": "yfinance", "quotes": quotes})


@router.get("/api/bolsa/detalhe")
async def bolsa_detalhe(request: Request) -> JSONResponse:
    if not _within_limits(request, "bolsa", LIMITS.stocks_per_ip_window, LIMITS.stocks_per_ip):
        return JSONResponse({"ok": False, "error": "limite"}, status_code=429)
    symbols = _symbols_of(request.query_params.get("s", ""))
    if not symbols:
        return JSONResponse({"ok": False, "error": "simbolos"}, status_code=400)
    data = await asyncio.to_thread(details_for, symbols[0])
    if not data:
        return JSONResponse({"ok": False, "error": "simbolo"}, status_code=404)
    return JSONResponse({"ok": True, **data})


@router.get("/api/bolsa/procurar")
async def bolsa_procurar(request: Request) -> JSONResponse:
    if not _within_limits(request, "bolsa-procura", LIMITS.stocks_search_window, LIMITS.stocks_search_per_ip):
        return JSONResponse({"ok": False, "error": "limite"}, status_code=429)
    q = one_line(request.query_params.get("q"), LIMITS.stocks_query)
    if not q:
        return JSONResponse({"ok": False, "error": "procura"}, status_code=400)
    results = await asyncio.to_thread(search_for, q)
    return JSONResponse({"ok": True, "results": results})
