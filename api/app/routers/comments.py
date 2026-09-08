# ─────────────────────────────────────────────────────────────────────
# Comentários e reações nos escritos.
#
#   GET  /api/comentarios?post=slug         os comentários e as contagens de reação
#   POST /api/comentarios                   deixar um comentário
#   POST /api/comentarios/reagir            ligar ou desligar uma reação
#   POST /api/comentarios/remover           remove um comentário — só o dono
#
# Com sessão, o nome e o email vêm dela — sem inventar dados. Sem
# sessão, tal como o formulário de contacto: nome e email a pedir, os
# mesmos portões (origem, token, armadilha, limites).
# ─────────────────────────────────────────────────────────────────────
import re

from fastapi import APIRouter, Request
from starlette.responses import JSONResponse

from app.comments_store import add_comment, for_post, remove_comment
from app.config import COMMENTS, LIMITS, SITE_ORIGIN
from app.http import read_json
from app.owner_guard import require_owner
from app.reactions_store import KINDS, counts_for, mine_for, toggle
from app.security import bump, check_token, ip_key, wrong_origin
from app.sessions import read_session
from app.validation import EMAIL_RE, clean, one_line

router = APIRouter()

_POST_RE = re.compile(r"^[a-z0-9-]{1,80}$")


def _valid_post(raw: object) -> str:
    value = raw if isinstance(raw, str) else ""
    return value if _POST_RE.match(value) else ""


@router.get("/api/comentarios")
async def listar(request: Request) -> JSONResponse:
    post = _valid_post(request.query_params.get("post"))
    if not post:
        return JSONResponse({"ok": False, "error": "escrito"}, status_code=400)

    email = read_session(request.headers.get("cookie", ""))
    fingerprint = email or ip_key(request)
    return JSONResponse(
        {
            "ok": True,
            "comments": for_post(post, LIMITS.comments_per_post),
            "reactions": counts_for(post),
            "mine": mine_for(post, fingerprint),
        }
    )


@router.post("/api/comentarios")
async def comentar(request: Request) -> JSONResponse:
    bad = wrong_origin(request, SITE_ORIGIN)
    if bad:
        return JSONResponse({"ok": False, "error": bad}, status_code=403 if bad == "origem" else 415)

    key = ip_key(request)
    if not bump("comentario:" + key, LIMITS.comment_per_ip_window, LIMITS.comment_per_ip):
        return JSONResponse({"ok": False, "error": "limite"}, status_code=429)
    if not bump("comentario:global", LIMITS.comment_global_window, LIMITS.comment_global):
        return JSONResponse({"ok": False, "error": "limite"}, status_code=429)

    payload = await read_json(request)
    if payload is None:
        return JSONResponse({"ok": False, "error": "corpo"}, status_code=400)

    # Armadilha: campo invisível que só um robô preenche.
    if clean(payload.get("company"), 200):
        return JSONResponse({"ok": True})

    token_error = check_token(payload.get("token"), key, min_age=LIMITS.token_min_age)
    if token_error:
        return JSONResponse({"ok": False, "error": token_error}, status_code=400)

    post = _valid_post(payload.get("post"))
    lang = "en" if payload.get("lang") == "en" else "pt"
    body = clean(payload.get("body"), COMMENTS.body_max)
    if not post or len(body) < 3:
        return JSONResponse({"ok": False, "error": "dados"}, status_code=400)

    session_email = read_session(request.headers.get("cookie", ""))
    if session_email:
        name = one_line(payload.get("name"), COMMENTS.name_max) or session_email.split("@")[0]
        email = session_email
    else:
        name = one_line(payload.get("name"), COMMENTS.name_max)
        email = one_line(payload.get("email"), LIMITS.email)
        if not name or not EMAIL_RE.match(email):
            return JSONResponse({"ok": False, "error": "identidade"}, status_code=400)

    row = await add_comment(post, lang, name, email, body)
    print("[comentarios] comentário novo")
    return JSONResponse({"ok": True, "comment": {"id": row["id"], "name": row["name"], "body": row["body"], "at": row["at"]}})


@router.post("/api/comentarios/reagir")
async def reagir(request: Request) -> JSONResponse:
    bad = wrong_origin(request, SITE_ORIGIN)
    if bad:
        return JSONResponse({"ok": False, "error": bad}, status_code=403 if bad == "origem" else 415)

    key = ip_key(request)
    if not bump("reagir:" + key, LIMITS.reaction_per_ip_window, LIMITS.reaction_per_ip):
        return JSONResponse({"ok": False, "error": "limite"}, status_code=429)

    payload = await read_json(request)
    if payload is None:
        return JSONResponse({"ok": False, "error": "corpo"}, status_code=400)

    post = _valid_post(payload.get("post"))
    kind = payload.get("kind")
    if not post or kind not in KINDS:
        return JSONResponse({"ok": False, "error": "dados"}, status_code=400)

    email = read_session(request.headers.get("cookie", ""))
    fingerprint = email or key
    active = await toggle(post, kind, fingerprint)
    return JSONResponse({"ok": True, "active": active, "reactions": counts_for(post)})


@router.post("/api/comentarios/remover")
async def remover(request: Request) -> JSONResponse:
    _, error = require_owner(request)
    if error:
        return error
    bad = wrong_origin(request, SITE_ORIGIN)
    if bad:
        return JSONResponse({"ok": False, "error": bad}, status_code=403 if bad == "origem" else 415)

    payload = await read_json(request)
    if payload is None:
        return JSONResponse({"ok": False, "error": "corpo"}, status_code=400)
    comment_id = one_line(payload.get("id"), 40)
    row = await remove_comment(comment_id)
    if not row:
        return JSONResponse({"ok": False, "error": "inexistente"}, status_code=404)
    print("[comentarios] comentário removido pelo dono")
    return JSONResponse({"ok": True})
