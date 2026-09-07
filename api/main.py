# ─────────────────────────────────────────────────────────────────────
# A API da Bolsa: um FastAPI pequeno à frente do yfinance.
#
# É um serviço à parte do site, e só o servidor do site fala com ele —
# fica numa rede interna, sem porta para fora. Por isso não tem
# autenticação nem limites próprios: quem os aplica é o servidor Node,
# que já os tem para tudo o resto. O que tem é o que qualquer serviço
# público precisaria na mesma: entradas com forma fixa e respostas
# pequenas.
#
#   GET /quotes?symbols=AAPL,MSFT   cotação e linha do dia de cada um
#   GET /chart/AAPL?range=1m        a série de um intervalo
#   GET /details/AAPL               a ficha (estatísticas, perfil, notícias)
#   GET /search?q=apple             símbolos por nome ou por sigla
#   GET /healthz
#
# Os endpoints são síncronos de propósito: o FastAPI corre-os num
# thread pool, e o yfinance é bloqueante.
# ─────────────────────────────────────────────────────────────────────
import re

from fastapi import FastAPI, Query
from fastapi.responses import JSONResponse

import bolsa

app = FastAPI(title="Bolsa", docs_url=None, redoc_url=None, openapi_url=None)

# O primeiro carácter também pode ser '^': é assim que o Yahoo escreve
# um índice — '^GSPC' é o S&P 500, e está na lista por omissão.
SYMBOL_RE = re.compile(r"^[A-Z0-9^][A-Z0-9.=^-]{0,11}$")
MAX_SYMBOLS = 12


def symbols_of(raw: str) -> list[str]:
    seen: list[str] = []
    for part in raw.upper().split(","):
        s = part.strip()
        if s and SYMBOL_RE.match(s) and s not in seen:
            seen.append(s)
    return seen[:MAX_SYMBOLS]


def not_found(what: str) -> JSONResponse:
    return JSONResponse({"ok": False, "error": what}, status_code=404)


@app.get("/healthz")
def health() -> dict:
    return {"ok": True}


@app.get("/quotes")
def quotes(symbols: str = Query("", max_length=200)) -> object:
    syms = symbols_of(symbols)
    if not syms:
        return JSONResponse({"ok": False, "error": "simbolos"}, status_code=400)
    return {"ok": True, "quotes": bolsa.quotes_for(syms)}


@app.get("/chart/{symbol}")
def chart(symbol: str, r: str = Query("1d", alias="range", max_length=4)) -> object:
    syms = symbols_of(symbol)
    if not syms:
        return not_found("simbolo")
    data = bolsa.chart_for(syms[0], r)
    return {"ok": True, **data} if data else not_found("simbolo")


@app.get("/details/{symbol}")
def details(symbol: str) -> object:
    syms = symbols_of(symbol)
    if not syms:
        return not_found("simbolo")
    data = bolsa.details_for(syms[0])
    return {"ok": True, **data} if data else not_found("simbolo")


@app.get("/search")
def search(q: str = Query("", max_length=40)) -> dict:
    return {"ok": True, "results": bolsa.search_for(q)}
