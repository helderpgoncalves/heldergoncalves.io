# ─────────────────────────────────────────────────────────────────────
# As reuniões: ver quando há, marcar, desmarcar.
#
#   GET  /api/reunioes/disponibilidade?from=&to=   os horários livres, e as minhas
#   POST /api/reunioes                             marca uma
#   POST /api/reunioes/cancelar                    desmarca uma minha
#
# Tudo com sessão. Sem ela, 401 — e o calendário do lado de lá mostra o
# mês vazio e pede o email. É a regra que se quis: quem não entrou não
# vê a agenda de ninguém.
# ─────────────────────────────────────────────────────────────────────
import re
from datetime import datetime, timezone

from fastapi import APIRouter, Request
from starlette.responses import JSONResponse

from app.availability import describe, free_slots, is_free, meeting_end
from app.config import LIMITS, MAIL, MEETINGS, SITE_ORIGIN, AUTH_READY
from app.copy import MEETING_COPY, pick_lang
from app.http import read_json
from app.mail import send_mail
from app.meetings import book, booked_starts, booked_today, cancel, list_for
from app.security import bump, ip_key, wrong_origin
from app.sessions import read_session
from app.validation import clean, one_line

router = APIRouter()

_DAY_RE = re.compile(r"^\d{4}-\d{2}-\d{2}$")


@router.get("/api/reunioes/disponibilidade")
async def disponibilidade(request: Request) -> JSONResponse:
    if not AUTH_READY:
        return JSONResponse({"ok": False, "error": "indisponivel"}, status_code=503)
    email = read_session(request.headers.get("cookie", ""))
    if not email:
        return JSONResponse({"ok": False, "error": "sessao"}, status_code=401)

    key = ip_key(request)
    if not bump("agenda:" + key, LIMITS.agenda_window, LIMITS.agenda_per_ip):
        return JSONResponse({"ok": False, "error": "limite"}, status_code=429)

    from_day = request.query_params.get("from", "")
    to_day = request.query_params.get("to", "")
    if not _DAY_RE.match(from_day) or not _DAY_RE.match(to_day):
        return JSONResponse({"ok": False, "error": "datas"}, status_code=400)
    try:
        span = datetime.fromisoformat(to_day) - datetime.fromisoformat(from_day)
    except ValueError:
        return JSONResponse({"ok": False, "error": "datas"}, status_code=400)
    if span.days > 62:
        return JSONResponse({"ok": False, "error": "datas"}, status_code=400)

    return JSONResponse(
        {
            "ok": True,
            "tz": MEETINGS.tz,
            "minutes": MEETINGS.minutes,
            "slots": free_slots(from_day, to_day, booked_starts()),
            "mine": list_for(email),
        }
    )


@router.post("/api/reunioes")
async def marcar(request: Request) -> JSONResponse:
    if not AUTH_READY:
        return JSONResponse({"ok": False, "error": "indisponivel"}, status_code=503)
    email = read_session(request.headers.get("cookie", ""))
    if not email:
        return JSONResponse({"ok": False, "error": "sessao"}, status_code=401)

    bad = wrong_origin(request, SITE_ORIGIN)
    if bad:
        return JSONResponse({"ok": False, "error": bad}, status_code=403 if bad == "origem" else 415)

    key = ip_key(request)
    if not bump("marcar:" + key, LIMITS.book_window, LIMITS.book_per_ip):
        return JSONResponse({"ok": False, "error": "limite"}, status_code=429)
    if booked_today(email) >= LIMITS.book_per_user_day:
        return JSONResponse({"ok": False, "error": "limite"}, status_code=429)

    payload = await read_json(request)
    if payload is None:
        return JSONResponse({"ok": False, "error": "corpo"}, status_code=400)

    start_raw = one_line(payload.get("start"), 40)
    title = one_line(payload.get("title"), LIMITS.subject) or ""
    note = clean(payload.get("note"), LIMITS.meeting_note)
    lang = pick_lang(payload.get("lang"))
    # O fuso de quem marca, só para o email de confirmação **dela** — o
    # que vai para o Hélder fica sempre no de Lisboa, que é o dele.
    visitor_tz = one_line(payload.get("tz"), 64) or None
    taken = booked_starts()
    if not is_free(start_raw, taken):
        return JSONResponse({"ok": False, "error": "ocupado"}, status_code=409)

    dt = datetime.fromisoformat(start_raw.replace("Z", "+00:00")).astimezone(timezone.utc)
    iso = dt.isoformat(timespec="milliseconds").replace("+00:00", "Z")
    row = await book(email, iso, meeting_end(iso), title, note, lang)
    print("[reunioes] reunião marcada")

    copy = MEETING_COPY[lang]
    when_owner = describe(iso, lang)
    when_visitor = describe(iso, lang, tz=visitor_tz)
    # O email ao Hélder é o que faz a reunião existir a sério; o da
    # pessoa é a confirmação. Se algum falhar, a marcação fica na mesma.
    await send_mail(to=MAIL.to, reply_to=email, subject=copy["ownerSubject"](when_owner), text=copy["ownerBody"](when_owner, email, title, note))
    await send_mail(to=email, subject=copy["userSubject"](when_visitor), text=copy["userBody"](when_visitor, title))

    return JSONResponse({"ok": True, "meeting": {"id": row["id"], "start": row["start"], "end": row["end"], "title": title, "note": note}})


@router.post("/api/reunioes/cancelar")
async def cancelar(request: Request) -> JSONResponse:
    if not AUTH_READY:
        return JSONResponse({"ok": False, "error": "indisponivel"}, status_code=503)
    email = read_session(request.headers.get("cookie", ""))
    if not email:
        return JSONResponse({"ok": False, "error": "sessao"}, status_code=401)
    bad = wrong_origin(request, SITE_ORIGIN)
    if bad:
        return JSONResponse({"ok": False, "error": bad}, status_code=403 if bad == "origem" else 415)

    payload = await read_json(request)
    if payload is None:
        return JSONResponse({"ok": False, "error": "corpo"}, status_code=400)
    meeting_id = one_line(payload.get("id"), 40)
    row = await cancel(meeting_id, email)
    if not row:
        return JSONResponse({"ok": False, "error": "reuniao"}, status_code=404)
    print("[reunioes] reunião cancelada")
    copy = MEETING_COPY[pick_lang(row.get("lang"))]
    when = describe(row["start"], row.get("lang"))
    await send_mail(to=MAIL.to, reply_to=email, subject=copy["cancelSubject"](when), text=copy["cancelBody"](when, email))
    return JSONResponse({"ok": True})
