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
import base64
import binascii
from datetime import datetime, timezone

from fastapi import APIRouter, Request
from starlette.responses import JSONResponse

from app import escritos_repo
from app.config import GITHUB_READY, LIMITS, MAIL_READY, SITE_ORIGIN
from app.escritos_md import LANGS, SLUG_RE, file_path, slugify, to_markdown
from app.github import PublishError, put_bytes, put_file
from app.http import read_json
from app.newsletter import announce, post_url
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

    # Avisar a lista é o passo a seguir ao commit, e só corre se o
    # commit tiver corrido: nunca se anuncia um escrito que não ficou.
    # `announce` arranca a tarefa e volta — o envio em si não segura
    # esta resposta (ver newsletter.py).
    avisados = await announce(escrito) if MAIL_READY else 0
    return JSONResponse(
        {"ok": True, "escrito": saved, "path": path, "url": post_url(escrito["lang"], escrito["slug"]), "avisados": avisados}
    )


# ── Imagens ──────────────────────────────────────────────────────────
# Uma imagem de um escrito é um commit como o Markdown é: vai para
# `public/`, que o Astro copia tal e qual para a raiz do site. Chega em
# base64 dentro do JSON de sempre — um upload multipart obrigava a mais
# uma dependência (`python-multipart`) para fazer o que isto já faz.
#
# O ficheiro é aceite pela assinatura, não pelo nome: quem tem a sessão
# do dono não é um atacante, mas um `.png` que afinal é outra coisa
# passa a servir-se do nosso domínio, e isso não se deixa acontecer por
# distracção.
ASSINATURAS = {
    "png": (b"\x89PNG\r\n\x1a\n",),
    "jpg": (b"\xff\xd8\xff",),
    "jpeg": (b"\xff\xd8\xff",),
    "gif": (b"GIF87a", b"GIF89a"),
    "webp": (b"RIFF",),
    "avif": (b"\x00\x00\x00",),
}


def _decode(raw: object) -> bytes | None:
    """O que o editor manda: `data:image/png;base64,AAAA…` ou só o
    base64. Mais do que o tecto, ou base64 partido, é `None`."""
    if not isinstance(raw, str) or not raw:
        return None
    body = raw.split(",", 1)[1] if raw.startswith("data:") else raw
    if len(body) > LIMITS.escrito_image * 4 // 3 + 1024:
        return None
    try:
        return base64.b64decode(body, validate=True)
    except (ValueError, binascii.Error):
        return None


@router.post("/api/escritos/imagem")
async def imagem(request: Request) -> JSONResponse:
    error = _gate(request)
    if error:
        return error
    if not GITHUB_READY:
        return JSONResponse({"ok": False, "error": "indisponivel"}, status_code=503)
    payload = await read_json(request, cap=LIMITS.escrito_image * 4 // 3 + 8192)
    if payload is None:
        return JSONResponse({"ok": False, "error": "corpo"}, status_code=400)

    escrito = await escritos_repo.get(one_line(payload.get("id"), 40))
    if escrito is None:
        return JSONResponse({"ok": False, "error": "inexistente"}, status_code=404)

    nome = one_line(payload.get("nome"), 120)
    ext = nome.rsplit(".", 1)[-1].lower() if "." in nome else ""
    if ext not in ASSINATURAS:
        return JSONResponse({"ok": False, "error": "formato"}, status_code=400)

    dados = _decode(payload.get("dados"))
    if not dados or len(dados) > LIMITS.escrito_image:
        return JSONResponse({"ok": False, "error": "tamanho"}, status_code=400)
    if not any(dados.startswith(sig) for sig in ASSINATURAS[ext]):
        return JSONResponse({"ok": False, "error": "formato"}, status_code=400)

    pasta = escrito["slug"] or slugify(escrito["titulo"]) or "sem-titulo"
    ficheiro = (slugify(nome.rsplit(".", 1)[0]) or "imagem") + "." + ext
    path = f"public/img/blog/{pasta}/{ficheiro}"
    try:
        await put_bytes(path, dados, f"Imagem para «{escrito['titulo'] or pasta}»")
    except PublishError as err:
        print(f"[escritos] o GitHub recusou a imagem ({err.status})")
        return JSONResponse({"ok": False, "error": "github"}, status_code=502)
    except Exception:  # noqa: BLE001 — rede em baixo, DNS, timeout: a mesma resposta
        print("[escritos] o GitHub não respondeu à imagem")
        return JSONResponse({"ok": False, "error": "github"}, status_code=502)

    # O caminho servido é o de dentro de `public/`, sem o prefixo. A
    # imagem só existe no site depois do deploy que vem a seguir ao
    # commit — tal como o próprio escrito.
    url = f"/img/blog/{pasta}/{ficheiro}"
    print("[escritos] imagem publicada pelo dono")
    return JSONResponse({"ok": True, "url": url, "markdown": f"![]({url})"})
