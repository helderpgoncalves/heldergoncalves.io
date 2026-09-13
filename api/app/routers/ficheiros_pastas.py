# ─────────────────────────────────────────────────────────────────────
# As pastas, que só o dono cria.
#
#   POST /api/ficheiros/pastas             cria uma pasta, privada ou partilhada
#   POST /api/ficheiros/pastas/partilhar   dá-a a um cliente, ou tira-lhe a partilha
#   POST /api/ficheiros/pastas/remover     remove-a, e o que lá está dentro
#
# Saiu de `ficheiros.py` quando esse passou das 400 linhas: gerir as
# pastas é um sub-recurso, e é por sub-recurso que um router se parte
# (ver .claude/rules/api.md). Os portões vêm de lá — são os mesmos, e
# tê-los em dois sítios era ter dois sítios onde se podiam divergir.
# ─────────────────────────────────────────────────────────────────────
from fastapi import APIRouter, Request
from starlette.responses import JSONResponse

from app import ficheiros_store as loja
from app.config import LIMITS
from app.routers.ficheiros import _limite, _origem, _sessao
from app.validation import EMAIL_RE, one_line

router = APIRouter()

@router.post("/api/ficheiros/pastas")
async def criar_pasta(request: Request) -> JSONResponse:
    email, dono, error = _sessao(request)
    if error:
        return error
    if not dono:
        return JSONResponse({"ok": False, "error": "dono"}, status_code=403)
    error = _origem(request) or _limite(request)
    if error:
        return error
    payload = await read_json(request)
    if payload is None:
        return JSONResponse({"ok": False, "error": "corpo"}, status_code=400)

    nome = one_line(payload.get("nome"), LIMITS.pasta_nome)
    # Sem cliente, a pasta é privada — só do dono. Com cliente, tem de
    # ser um email a sério: um texto qualquer aqui criava uma pasta que
    # ninguém conseguia abrir, e que parecia partilhada.
    cliente = one_line(payload.get("cliente"), LIMITS.email).lower()
    if not nome or (cliente and not EMAIL_RE.match(cliente)):
        return JSONResponse({"ok": False, "error": "dados"}, status_code=400)
    if len(loja.pastas_todas()) >= LIMITS.pastas_max:
        return JSONResponse({"ok": False, "error": "cheio"}, status_code=409)

    pasta = await loja.criar_pasta(nome, cliente)
    print("[ficheiros] pasta nova criada pelo dono")
    return JSONResponse({"ok": True, "pasta": pasta})


@router.post("/api/ficheiros/pastas/partilhar")
async def partilhar_pasta(request: Request) -> JSONResponse:
    """Partilha uma pasta com um cliente, ou tira-lhe a partilha com o
    `cliente` vazio. Só o dono — é ele que decide o que mostra e a quem,
    e é por isso que uma pasta pode nascer privada e passar a partilhada
    quando estiver pronta."""
    email, dono, error = _sessao(request)
    if error:
        return error
    if not dono:
        return JSONResponse({"ok": False, "error": "dono"}, status_code=403)
    error = _origem(request) or _limite(request)
    if error:
        return error
    payload = await read_json(request)
    if payload is None:
        return JSONResponse({"ok": False, "error": "corpo"}, status_code=400)

    cliente = one_line(payload.get("cliente"), LIMITS.email).lower()
    # Vazio tira a partilha. Com valor, tem de ser um email a sério:
    # um texto qualquer deixava a pasta a parecer partilhada com
    # alguém que nunca a conseguiria abrir.
    if cliente and not EMAIL_RE.match(cliente):
        return JSONResponse({"ok": False, "error": "dados"}, status_code=400)

    pasta = await loja.partilhar_pasta(one_line(payload.get("id"), 40), cliente)
    if not pasta:
        return JSONResponse({"ok": False, "error": "inexistente"}, status_code=404)
    print("[ficheiros] o dono mudou a partilha de uma pasta")
    return JSONResponse({"ok": True, "pasta": pasta})


@router.post("/api/ficheiros/pastas/remover")
async def remover_pasta(request: Request) -> JSONResponse:
    email, dono, error = _sessao(request)
    if error:
        return error
    if not dono:
        return JSONResponse({"ok": False, "error": "dono"}, status_code=403)
    error = _origem(request) or _limite(request)
    if error:
        return error
    payload = await read_json(request)
    if payload is None:
        return JSONResponse({"ok": False, "error": "corpo"}, status_code=400)
    if not await loja.remover_pasta(one_line(payload.get("id"), 40)):
        return JSONResponse({"ok": False, "error": "inexistente"}, status_code=404)
    print("[ficheiros] pasta removida pelo dono")
    return JSONResponse({"ok": True})
