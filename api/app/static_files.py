# ─────────────────────────────────────────────────────────────────────
# Servir o que o Astro gerou.
#
# As versões comprimidas vêm prontas do build (`scripts/precompress.mjs`
# escreve um `.br` e um `.gz` ao lado de cada ficheiro), por isso servir
# é ler bytes e mandá-los — a API nunca comprime nada em tempo de
# pedido.
#
# Cada ficheiro é lido e etiquetado uma única vez e fica em memória. O
# que muda a cada pedido é só a escolha entre brotli, gzip e nada.
# ─────────────────────────────────────────────────────────────────────
import hashlib
from dataclasses import dataclass
from pathlib import Path
from typing import Optional
from urllib.parse import unquote

from starlette.requests import Request
from starlette.responses import PlainTextResponse, RedirectResponse, Response

from app.config import ROOT
from app.security import SECURITY_HEADERS

TYPES = {
    ".html": "text/html; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".js": "text/javascript; charset=utf-8",
    ".mjs": "text/javascript; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".txt": "text/plain; charset=utf-8",
    ".xml": "application/xml; charset=utf-8",
    ".xsl": "application/xslt+xml; charset=utf-8",
    ".svg": "image/svg+xml",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".webp": "image/webp",
    ".avif": "image/avif",
    ".ico": "image/x-icon",
    ".webmanifest": "application/manifest+json",
    ".woff2": "font/woff2",
    ".map": "application/json; charset=utf-8",
}

# ── A cache, com tecto ───────────────────────────────────────────────
# Guardar tudo o que já foi pedido é rápido e é uma fuga de memória com
# outro nome: basta o site crescer, ou alguém pedir todas as imagens por
# ordem, para o processo ficar a segurar o disco inteiro.
#
# Por isso há um orçamento em bytes e, quando ele estufa, sai o que há
# mais tempo não é pedido — um dicionário guarda a ordem de inserção, e
# apagar e voltar a pôr uma entrada em cada acerto dá o LRU de graça.
BUDGET = 24 * 1024 * 1024


@dataclass
class _Entry:
    body: bytes
    type: str
    etag: str
    br: Optional[bytes]
    gzip: Optional[bytes]

    def weigh(self) -> int:
        return len(self.body) + (len(self.br) if self.br else 0) + (len(self.gzip) if self.gzip else 0)


_cache: dict[Path, _Entry] = {}
_held = 0


def _remember(file: Path, entry: _Entry) -> _Entry:
    global _held
    size = entry.weigh()
    if size > BUDGET:  # um ficheiro que sozinho não cabe no orçamento serve-se e esquece-se
        return entry
    _cache[file] = entry
    _held += size
    for oldest in list(_cache.keys()):
        if _held <= BUDGET or oldest == file:
            break
        victim = _cache.pop(oldest)
        _held -= victim.weigh()
    return entry


def _recall(file: Path) -> Optional[_Entry]:
    hit = _cache.pop(file, None)  # volta para o fim da fila: último a sair
    if hit is not None:
        _cache[file] = hit
    return hit


def _sidecar(file: Path, ext: str) -> Optional[bytes]:
    try:
        return (file.parent / (file.name + ext)).read_bytes()
    except OSError:
        return None


def load(file: Path) -> _Entry:
    hit = _recall(file)
    if hit:
        return hit

    body = file.read_bytes()
    type_ = TYPES.get(file.suffix.lower(), "application/octet-stream")
    entry = _Entry(
        body=body,
        type=type_,
        etag='"' + hashlib.sha1(body).hexdigest()[:22] + '"',
        br=_sidecar(file, ".br"),
        gzip=_sidecar(file, ".gz"),
    )
    return _remember(file, entry)


def _safe_path(pathname: str) -> Optional[Path]:
    """Resolve o pedido para um caminho dentro de ROOT — ou None."""
    try:
        decoded = unquote(pathname)
    except (UnicodeDecodeError, ValueError):
        return None
    if "\x00" in decoded:
        return None
    rel = decoded.lstrip("/\\")
    full = (ROOT / rel).resolve()
    if full != ROOT and ROOT not in full.parents:
        return None
    return full


def _cache_control(url_path: str, type_: str) -> str:
    """Quanto tempo o browser pode guardar cada coisa. O que tem impressão
    digital no nome guarda-se para sempre; o HTML nunca, porque é o
    ficheiro que aponta para todos os outros."""
    if url_path == "/sw.js":
        return "public, max-age=0, must-revalidate"
    if url_path.startswith("/_astro/") or url_path.startswith("/fonts/"):
        return "public, max-age=31536000, immutable"
    if type_.startswith("text/html"):
        return "public, max-age=0, must-revalidate"
    return "public, max-age=3600"


def _serve_file(request: Request, file: Path, url_path: str, status: int = 200) -> Response:
    entry = load(file)
    control = _cache_control(url_path, entry.type)
    headers = {**SECURITY_HEADERS, "Cache-Control": control, "ETag": entry.etag, "Vary": "Accept-Encoding"}

    if status == 200 and request.headers.get("if-none-match") == entry.etag:
        return Response(status_code=304, headers=headers)

    accept = request.headers.get("accept-encoding", "")
    body, encoding = entry.body, None
    if entry.br and "br" in accept:
        body, encoding = entry.br, "br"
    elif entry.gzip and "gzip" in accept:
        body, encoding = entry.gzip, "gzip"
    if encoding:
        headers["Content-Encoding"] = encoding

    method = "HEAD" if request.method == "HEAD" else "GET"
    return Response(
        content=b"" if method == "HEAD" else body,
        status_code=status,
        media_type=entry.type,
        headers=headers,
    )


def _not_found(request: Request) -> Response:
    try:
        return _serve_file(request, ROOT / "404.html", "/404.html", status=404)
    except OSError:
        return PlainTextResponse("Not found", status_code=404, headers=SECURITY_HEADERS)


_SIDECAR_SUFFIXES = (".br", ".gz")


async def handle_static(request: Request) -> Response:
    url_path = request.url.path

    if url_path.endswith(_SIDECAR_SUFFIXES):  # os ficheiros comprimidos acompanham o original
        return _not_found(request)

    file = _safe_path(url_path)
    if file is None:
        return PlainTextResponse("Bad request", status_code=400, headers=SECURITY_HEADERS)

    if file.is_dir():
        if not url_path.endswith("/"):
            return RedirectResponse(url_path + "/" + ("?" + request.url.query if request.url.query else ""), status_code=308)
        try:
            return _serve_file(request, file / "index.html", url_path)
        except OSError:
            return _not_found(request)

    if file.is_file():
        return _serve_file(request, file, url_path)

    # Sem extensão: o Astro gera `sobre.html` para `/sobre`.
    try:
        return _serve_file(request, file.with_name(file.name + ".html"), url_path)
    except OSError:
        return _not_found(request)


def cache_stats() -> dict:
    return {"files": len(_cache), "bytes": _held}


# ── Aquecer a cache no arranque ──────────────────────────────────────
# Sem isto, o primeiro visitante depois de cada deploy paga a leitura de
# cada ficheiro que toca. Corre depois de a API já estar a atender, e
# nunca bloqueia nada: se falhar, falha em silêncio — é uma optimização,
# não um requisito. Tectos apertados de propósito: isto serve para a
# primeira página não esperar por disco, não para trazer o site todo
# para a memória — disso trata a própria cache, com o seu orçamento.
_WARM_SUFFIXES = {".html", ".css", ".js", ".mjs"}
_WARM_MAX_FILES = 40
_WARM_MAX_BYTES = 4 * 1024 * 1024


def warm_cache() -> tuple[int, int]:
    files = 0
    bytes_ = 0
    if not ROOT.is_dir():
        return files, bytes_
    for path in ROOT.rglob("*"):
        if files >= _WARM_MAX_FILES or bytes_ >= _WARM_MAX_BYTES:
            break
        if not path.is_file() or path.suffix.lower() not in _WARM_SUFFIXES:
            continue
        try:
            entry = load(path)
        except OSError:
            continue
        files += 1
        bytes_ += len(entry.body)
    return files, bytes_
