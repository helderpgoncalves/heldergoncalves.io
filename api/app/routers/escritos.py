# ─────────────────────────────────────────────────────────────────────
# O dono escreve a partir do site: rascunhos, e publicar.
#
#   GET  /api/escritos/rascunhos          tudo o que o dono tem, e se publicar está ligado
#   POST /api/escritos/rascunhos          cria (sem id) ou guarda (com id) um rascunho
#   POST /api/escritos/rascunhos/remover  apaga um, pelo id
#   POST /api/escritos/publicar           faz o commit do Markdown no repositório
#
# Tudo só para o dono (`require_owner`), e por isso sem armadilha nem
# token de formulário: não há robô que tenha a sessão do dono. Ficam os
# portões de origem e de limites, como em routers/agenda.py.
#
# Publicar não muda o site na hora — mete o ficheiro em `main`, e é o
# deploy de sempre que o traz. A resposta diz isso mesmo.
# ─────────────────────────────────────────────────────────────────────
from datetime import datetime, timezone

from fastapi import APIRouter, Request
from starlette.responses import JSONResponse

from app import escritos_repo
from app.config import GITHUB_READY, LIMITS, SITE_ORIGIN
from app.escritos_md import LANGS, SLUG_RE, file_path, slugify, to_markdown
from app.github import PublishError, put_file
from app.http import read_json
from app.owner_guard import require_owner
from app.security import bump, ip_key, wrong_origin
from app.validation import clean, one_line

router = APIRouter()


def _gate(request: Request):
    """Os portões comuns às quatro rotas: dono, origem, e o limite."""
    _, error = require_owner(request)
    if error:
        return error
    if request.method == "POST":
        bad = wrong_origin(request, SITE_ORIGIN)
        if bad:
            return JSONResponse({"ok": False, "error": bad}, status_code=403 if bad == "origem" else 415)
    if not bump("escritos:" + ip_key(request), LIMITS.escritos_window, LIMITS.escritos_per_ip):
        return JSONResponse({"ok": False, "error": "limite"}, status_code=429)
    return None


def _fields(payload: dict) -> dict | None:
    """O que vem do editor, limpo. `None` se não for um rascunho válido."""
    titulo = one_line(payload.get("titulo"), 200)
    slug = one_line(payload.get("slug"), 80).lower() or slugify(titulo)
    lang = one_line(payload.get("lang"), 2).lower()
    if lang not in LANGS:
        return None
    if slug and not SLUG_RE.match(slug):
        return None
    raw_tags = payload.get("tags")
    if not isinstance(raw_tags, list):
        raw_tags = []
    tags = []
    for t in raw_tags[: LIMITS.escrito_tags]:
        t = one_line(t, 40).lower()
        if t and t not in tags:
            tags.append(t)
    return {
        "slug": slug,
        "lang": lang,
        "titulo": titulo,
        "descricao": one_line(payload.get("descricao"), 500),
        "tags": tags,
        "chave": one_line(payload.get("chave"), 80) or None,
        "corpo": clean(payload.get("corpo"), LIMITS.escrito_body),
    }


@router.get("/api/escritos/rascunhos")
async def listar(request: Request) -> JSONResponse:
    error = _gate(request)
    if error:
        return error
    return JSONResponse({"ok": True, "escritos": await escritos_repo.list_all(), "publicar": GITHUB_READY})


@router.post("/api/escritos/rascunhos")
async def guardar(request: Request) -> JSONResponse:
    error = _gate(request)
    if error:
        return error
    payload = await read_json(request, cap=LIMITS.escrito_body + 4096)
    if payload is None:
        return JSONResponse({"ok": False, "error": "corpo"}, status_code=400)
    fields = _fields(payload)
    if fields is None:
        return JSONResponse({"ok": False, "error": "dados"}, status_code=400)
    escrito = await escritos_repo.save(one_line(payload.get("id"), 40) or None, fields)
    if escrito is None:
        return JSONResponse({"ok": False, "error": "inexistente"}, status_code=404)
    return JSONResponse({"ok": True, "escrito": escrito})


@router.post("/api/escritos/rascunhos/remover")
async def remover(request: Request) -> JSONResponse:
    error = _gate(request)
    if error:
        return error
    payload = await read_json(request)
    if payload is None:
        return JSONResponse({"ok": False, "error": "corpo"}, status_code=400)
    if not await escritos_repo.delete(one_line(payload.get("id"), 40)):
        return JSONResponse({"ok": False, "error": "inexistente"}, status_code=404)
    print("[escritos] rascunho apagado pelo dono")
    return JSONResponse({"ok": True})


@router.post("/api/escritos/publicar")
async def publicar(request: Request) -> JSONResponse:
    error = _gate(request)
    if error:
        return error
    if not GITHUB_READY:
        return JSONResponse({"ok": False, "error": "indisponivel"}, status_code=503)
    payload = await read_json(request)
    if payload is None:
        return JSONResponse({"ok": False, "error": "corpo"}, status_code=400)
    escrito = await escritos_repo.get(one_line(payload.get("id"), 40))
    if escrito is None:
        return JSONResponse({"ok": False, "error": "inexistente"}, status_code=404)
    # Sem título não há escrito; sem slug não há ficheiro. O slug pode
    # ter ficado vazio num rascunho guardado antes do título existir.
    if not escrito["titulo"].strip():
        return JSONResponse({"ok": False, "error": "titulo"}, status_code=400)
    if not escrito["slug"]:
        escrito = await escritos_repo.save(escrito["id"], {"slug": slugify(escrito["titulo"])})
        if not escrito["slug"]:
            return JSONResponse({"ok": False, "error": "slug"}, status_code=400)

    when = datetime.now(timezone.utc).date()
    path = file_path(escrito)
    try:
        sha = await put_file(path, to_markdown(escrito, when), "Publica «" + escrito["titulo"] + "»")
    except PublishError as err:
        print(f"[escritos] o GitHub recusou o commit ({err.status})")
        return JSONResponse({"ok": False, "error": "github"}, status_code=502)
    except Exception:  # noqa: BLE001 — rede em baixo, DNS, timeout: tudo dá a mesma resposta
        print("[escritos] o GitHub não respondeu")
        return JSONResponse({"ok": False, "error": "github"}, status_code=502)

    saved = await escritos_repo.mark_published(escrito["id"], sha)
    print("[escritos] escrito publicado pelo dono")
    return JSONResponse({"ok": True, "escrito": saved, "path": path})
