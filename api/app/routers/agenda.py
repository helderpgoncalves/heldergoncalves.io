# ─────────────────────────────────────────────────────────────────────
# O que só o dono do Calendário pode fazer: ver a agenda cheia — quem
# marcou o quê — e mudar a disponibilidade por cima das janelas fixas.
#
#   GET  /api/reunioes/todas                  a agenda cheia, com quem marcou
#   GET  /api/reunioes/bloqueios               os bloqueios e aberturas activos
#   POST /api/reunioes/bloqueios                cria um bloqueio ou uma abertura
#   POST /api/reunioes/bloqueios/remover        remove um, pelo id
#
# Tudo exige sessão **e** que o email da sessão seja o `OWNER_EMAIL` —
# sem essa variável configurada, nenhuma sessão passa, mesmo que a
# pessoa entre com um código válido. Não é um papel que se atribua por
# dados; é uma comparação de uma string, e é essa a decisão de propósito:
# um site pessoal tem um dono, não uma tabela de permissões.
# ─────────────────────────────────────────────────────────────────────
import re
from datetime import datetime

from fastapi import APIRouter, Request
from starlette.responses import JSONResponse

from app.availability import to_iso_millis
from app.availability_store import KINDS, active_overrides, add_override, remove_override
from app.config import LIMITS, SITE_ORIGIN
from app.http import read_json
from app.meetings import all_between
from app.owner_guard import require_owner
from app.security import bump, ip_key, wrong_origin
from app.validation import clean, one_line

router = APIRouter()

_DAY_RE = re.compile(r"^\d{4}-\d{2}-\d{2}$")
_MAX_NOTE = 200


@router.get("/api/reunioes/todas")
async def todas(request: Request) -> JSONResponse:
    _, error = require_owner(request)
    if error:
        return error

    key = ip_key(request)
    if not bump("agenda-dono:" + key, LIMITS.agenda_window, LIMITS.agenda_per_ip):
        return JSONResponse({"ok": False, "error": "limite"}, status_code=429)

    from_day = request.query_params.get("from", "")
    to_day = request.query_params.get("to", "")
    if not _DAY_RE.match(from_day) or not _DAY_RE.match(to_day):
        return JSONResponse({"ok": False, "error": "datas"}, status_code=400)

    return JSONResponse({"ok": True, "meetings": all_between(from_day, to_day)})


@router.get("/api/reunioes/bloqueios")
async def bloqueios(request: Request) -> JSONResponse:
    _, error = require_owner(request)
    if error:
        return error
    return JSONResponse({"ok": True, "overrides": active_overrides()})


@router.post("/api/reunioes/bloqueios")
async def criar_bloqueio(request: Request) -> JSONResponse:
    _, error = require_owner(request)
    if error:
        return error
    bad = wrong_origin(request, SITE_ORIGIN)
    if bad:
        return JSONResponse({"ok": False, "error": bad}, status_code=403 if bad == "origem" else 415)

    payload = await read_json(request)
    if payload is None:
        return JSONResponse({"ok": False, "error": "corpo"}, status_code=400)

    kind = payload.get("kind")
    start_raw = one_line(payload.get("start"), 40)
    end_raw = one_line(payload.get("end"), 40)
    note = clean(payload.get("note"), _MAX_NOTE)
    if kind not in KINDS or not start_raw or not end_raw:
        return JSONResponse({"ok": False, "error": "dados"}, status_code=400)

    try:
        start_dt = datetime.fromisoformat(start_raw.replace("Z", "+00:00"))
        end_dt = datetime.fromisoformat(end_raw.replace("Z", "+00:00"))
    except ValueError:
        return JSONResponse({"ok": False, "error": "dados"}, status_code=400)
    # Exige um fuso explícito — um horário sem fuso é ambíguo, e é
    # precisamente o tipo de ambiguidade que não se quer numa marcação.
    if start_dt.tzinfo is None or end_dt.tzinfo is None:
        return JSONResponse({"ok": False, "error": "dados"}, status_code=400)
    if end_dt <= start_dt:
        return JSONResponse({"ok": False, "error": "intervalo"}, status_code=400)

    # Normalizado para UTC com milissegundos — o mesmo formato de `taken`
    # e de tudo o resto que `availability.py` compara.
    row = await add_override(kind, to_iso_millis(start_dt), to_iso_millis(end_dt), note)
    print(f"[disponibilidade] {kind} criado pelo dono")
    return JSONResponse({"ok": True, "override": row})


@router.post("/api/reunioes/bloqueios/remover")
async def remover_bloqueio(request: Request) -> JSONResponse:
    _, error = require_owner(request)
    if error:
        return error
    bad = wrong_origin(request, SITE_ORIGIN)
    if bad:
        return JSONResponse({"ok": False, "error": bad}, status_code=403 if bad == "origem" else 415)

    payload = await read_json(request)
    if payload is None:
        return JSONResponse({"ok": False, "error": "corpo"}, status_code=400)
    override_id = one_line(payload.get("id"), 40)
    row = await remove_override(override_id)
    if not row:
        return JSONResponse({"ok": False, "error": "inexistente"}, status_code=404)
    print("[disponibilidade] alteração removida pelo dono")
    return JSONResponse({"ok": True})
