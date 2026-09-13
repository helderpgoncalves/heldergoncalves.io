# ─────────────────────────────────────────────────────────────────────
# Os Ficheiros: as pastas que o dono partilha com cada cliente.
#
#   GET  /api/ficheiros                     as minhas pastas (todas, se for o dono)
#   GET  /api/ficheiros/pasta/{id}          o que está numa pasta
#   POST /api/ficheiros/pastas              cria uma pasta e atribui-a a um email (dono)
#   POST /api/ficheiros/pastas/remover      remove uma pasta e o que lá está (dono)
#   POST /api/ficheiros/carregar            larga um ficheiro numa pasta
#   POST /api/ficheiros/remover             tira um ficheiro de uma pasta
#   GET  /api/ficheiros/abrir/{id}          os bytes, com a sessão conferida
#
# Tudo com sessão. Sem ela, 401 — e a app abre o ecrã de entrar, como o
# resto do sistema. Um cliente só alcança as pastas atribuídas ao email
# com que entrou: adivinhar o `id` não serve de nada, porque o portão é
# `pode_ver`, não o URL.
#
# **Nada disto é servido estaticamente.** Os bytes não passam por
# `public/` nem por `dist/`: só saem por `abrir`, que confere a sessão a
# cada pedido. Um URL de um ficheiro de um cliente que caia noutras mãos
# não abre nada.
#
# Sem armadilha (`company`) nem token de formulário, pela mesma razão de
# `routers/escritos.py`: estes endpoints exigem uma sessão verdadeira, e
# um robô não a tem. Ficam os portões de origem e de limites.
# ─────────────────────────────────────────────────────────────────────
import base64
import binascii
import re
from typing import Optional
from urllib.parse import quote

from fastapi import APIRouter, Request
from starlette.responses import FileResponse, JSONResponse, Response

from app import armazem
from app import ficheiros_store as loja
from app.config import AUTH_READY, LIMITS, MAIL, SITE_ORIGIN
from app.copy import FILES_COPY, pick_lang
from app.http import read_json
from app.mail import send_mail
from app.security import bump, ip_key, wrong_origin
from app.sessions import is_owner, read_session
from app.validation import EMAIL_RE, one_line

router = APIRouter()

# O que se aceita partilhar com um cliente, e como se reconhece.
#
# Recusa-se SVG: é XML, leva `<script>` lá dentro, e servi-lo da nossa
# origem dava a quem o largasse um XSS no domínio inteiro. Recusa-se
# tudo o que é executável (`.exe`, `.app`, `.sh`, `.js`, `.html`) pelo
# mesmo motivo, e porque um ficheiro que se corre não é um entregável —
# é um problema para quem o recebe. Em zip ainda pode ir o que quiserem,
# mas aí é um ficheiro para guardar, nunca para abrir aqui dentro.
#
# A assinatura manda sobre a extensão: um `.pdf` que afinal é outra
# coisa não passa a servir-se daqui por distracção de quem o largou.
# `None` é para os tipos que não têm assinatura nenhuma — texto simples
# é texto simples.
ACEITES: dict[str, tuple[str, Optional[tuple[bytes, ...]]]] = {
    "png": ("image/png", (b"\x89PNG\r\n\x1a\n",)),
    "jpg": ("image/jpeg", (b"\xff\xd8\xff",)),
    "jpeg": ("image/jpeg", (b"\xff\xd8\xff",)),
    "gif": ("image/gif", (b"GIF87a", b"GIF89a")),
    "webp": ("image/webp", (b"RIFF",)),
    "avif": ("image/avif", (b"\x00\x00\x00",)),
    "pdf": ("application/pdf", (b"%PDF-",)),
    "txt": ("text/plain", None),
    "md": ("text/markdown", None),
    "csv": ("text/csv", None),
    "zip": ("application/zip", (b"PK\x03\x04", b"PK\x05\x06")),
    # Os três do Office são contentores zip — a assinatura é a do zip.
    "docx": ("application/vnd.openxmlformats-officedocument.wordprocessingml.document", (b"PK\x03\x04",)),
    "xlsx": ("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", (b"PK\x03\x04",)),
    "pptx": ("application/vnd.openxmlformats-officedocument.presentationml.presentation", (b"PK\x03\x04",)),
}

# O que o browser pode mostrar sem perigo: imagens, PDF e texto. Tudo o
# resto desce como anexo, e a app mostra-lhe um ícone.
VISIVEIS = {"image/png", "image/jpeg", "image/gif", "image/webp", "image/avif", "application/pdf"}


def _tipo_servido(tipo: str) -> str:
    """Todo o texto sai como `text/plain`, seja Markdown ou CSV. O tipo
    verdadeiro fica nos metadados; o que vai no fio é o mais inofensivo
    dos dois, porque é o browser que o vai interpretar."""
    return "text/plain; charset=utf-8" if tipo.startswith("text/") else tipo


def _sessao(request: Request) -> tuple[Optional[str], bool, Optional[JSONResponse]]:
    """Quem está a pedir, e se é o dono — ou o erro pronto a devolver."""
    if not AUTH_READY:
        return None, False, JSONResponse({"ok": False, "error": "indisponivel"}, status_code=503)
    email = read_session(request.headers.get("cookie", ""))
    if not email:
        return None, False, JSONResponse({"ok": False, "error": "sessao"}, status_code=401)
    return email, is_owner(email), None


def _limite(request: Request) -> Optional[JSONResponse]:
    if not bump("ficheiros:" + ip_key(request), LIMITS.ficheiros_window, LIMITS.ficheiros_per_ip):
        return JSONResponse({"ok": False, "error": "limite"}, status_code=429)
    return None


def _origem(request: Request) -> Optional[JSONResponse]:
    bad = wrong_origin(request, SITE_ORIGIN)
    if bad:
        return JSONResponse({"ok": False, "error": bad}, status_code=403 if bad == "origem" else 415)
    return None


def _pasta_visivel(pasta_id: str, email: str, dono: bool) -> Optional[dict]:
    row = loja.pasta(pasta_id)
    if not row or not loja.pode_ver(row, email, dono):
        return None
    return row


# ── Ver ──────────────────────────────────────────────────────────────
@router.get("/api/ficheiros")
async def listar(request: Request) -> JSONResponse:
    email, dono, error = _sessao(request)
    if error:
        return error
    error = _limite(request)
    if error:
        return error
    pastas = loja.pastas_todas() if dono else loja.pastas_de(email)
    # Os tipos e o tecto vão com a lista de propósito: a app não repete
    # nenhum número nem nenhuma extensão — pergunta-os a quem os decide,
    # que é `LIMITS` e a tabela `ACEITES`, aqui em cima.
    return JSONResponse(
        {"ok": True, "dono": dono, "pastas": pastas, "tipos": sorted(ACEITES), "tecto": LIMITS.ficheiro_max}
    )


@router.get("/api/ficheiros/pasta/{pasta_id}")
async def abrir_pasta(request: Request, pasta_id: str) -> JSONResponse:
    email, dono, error = _sessao(request)
    if error:
        return error
    error = _limite(request)
    if error:
        return error
    row = _pasta_visivel(pasta_id, email, dono)
    # A mesma resposta para «não existe» e «não é tua»: distinguir as
    # duas contava a quem adivinhasse um `id` que ele existe.
    if not row:
        return JSONResponse({"ok": False, "error": "inexistente"}, status_code=404)
    return JSONResponse(
        {
            "ok": True,
            "pasta": {"id": row["id"], "nome": row["nome"], "cliente": row["cliente"]},
            "ficheiros": loja.ficheiros_de(pasta_id),
            "ocupado": loja.ocupacao(pasta_id),
            "tecto": LIMITS.pasta_max,
        }
    )


# ── As pastas, que só o dono cria ────────────────────────────────────
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


# ── Largar um ficheiro ───────────────────────────────────────────────
# Em base64 dentro do JSON de sempre, como as imagens dos escritos
# (`routers/escritos.py`): um upload multipart obrigava a mais uma
# dependência (`python-multipart`) para fazer o que isto já faz.
def _decode(raw: object) -> Optional[bytes]:
    """`data:application/pdf;base64,AAAA…` ou só o base64. Mais do que o
    tecto, ou base64 partido, é `None`."""
    if not isinstance(raw, str) or not raw:
        return None
    corpo = raw.split(",", 1)[1] if raw.startswith("data:") else raw
    if len(corpo) > LIMITS.ficheiro_max * 4 // 3 + 1024:
        return None
    try:
        return base64.b64decode(corpo, validate=True)
    except (ValueError, binascii.Error):
        return None


@router.post("/api/ficheiros/carregar")
async def carregar(request: Request) -> JSONResponse:
    email, dono, error = _sessao(request)
    if error:
        return error
    error = _origem(request)
    if error:
        return error
    chave = ip_key(request)
    if not bump("ficheiro-novo:" + chave, LIMITS.ficheiro_upload_window, LIMITS.ficheiro_upload_per_ip):
        return JSONResponse({"ok": False, "error": "limite"}, status_code=429)
    if not bump("ficheiro-novo", LIMITS.ficheiro_upload_global_window, LIMITS.ficheiro_upload_global):
        return JSONResponse({"ok": False, "error": "limite"}, status_code=429)

    payload = await read_json(request, cap=LIMITS.ficheiro_max * 4 // 3 + 8192)
    if payload is None:
        return JSONResponse({"ok": False, "error": "corpo"}, status_code=400)

    pasta = _pasta_visivel(one_line(payload.get("pasta"), 40), email, dono)
    if not pasta:
        return JSONResponse({"ok": False, "error": "inexistente"}, status_code=404)

    nome = one_line(payload.get("nome"), LIMITS.ficheiro_nome)
    ext = nome.rsplit(".", 1)[-1].lower() if "." in nome else ""
    if ext not in ACEITES:
        return JSONResponse({"ok": False, "error": "formato"}, status_code=400)
    tipo, assinaturas = ACEITES[ext]

    dados = _decode(payload.get("dados"))
    if not dados or len(dados) > LIMITS.ficheiro_max:
        return JSONResponse({"ok": False, "error": "tamanho"}, status_code=400)
    if assinaturas and not any(dados.startswith(sig) for sig in assinaturas):
        return JSONResponse({"ok": False, "error": "formato"}, status_code=400)

    dentro = loja.ficheiros_de(pasta["id"])
    if len(dentro) >= LIMITS.pasta_ficheiros:
        return JSONResponse({"ok": False, "error": "cheio"}, status_code=409)
    if loja.ocupacao(pasta["id"]) + len(dados) > LIMITS.pasta_max:
        return JSONResponse({"ok": False, "error": "cheio"}, status_code=409)

    guardado = await loja.guardar_ficheiro(pasta["id"], nome, tipo, dados, email)
    if guardado is None:
        # O armazém não aceitou os bytes. Não se regista nada e não se
        # avisa ninguém: dizer «está lá» sobre um ficheiro que não está
        # é pior do que dizer que não deu.
        print("[ficheiros] o armazém recusou um ficheiro")
        return JSONResponse({"ok": False, "error": "armazem"}, status_code=502)
    print("[ficheiros] ficheiro novo numa pasta partilhada")
    await _avisar(pick_lang(payload.get("lang")), pasta, nome, email, dono)
    return JSONResponse({"ok": True, "ficheiro": guardado})


async def _avisar(lang: str, pasta: dict, nome: str, quem: str, dono: bool) -> None:
    """O outro lado fica a saber. Se o email falhar, o ficheiro fica na
    mesma — é o mesmo contrato das reuniões."""
    copy = FILES_COPY[lang]
    if dono:
        await send_mail(to=pasta["cliente"], subject=copy["clientSubject"](pasta["nome"]), text=copy["clientBody"](pasta["nome"], nome))
    else:
        await send_mail(
            to=MAIL.to,
            reply_to=quem,
            subject=copy["ownerSubject"](pasta["nome"]),
            text=copy["ownerBody"](pasta["nome"], nome, quem),
        )


@router.post("/api/ficheiros/remover")
async def remover(request: Request) -> JSONResponse:
    email, dono, error = _sessao(request)
    if error:
        return error
    error = _origem(request) or _limite(request)
    if error:
        return error
    payload = await read_json(request)
    if payload is None:
        return JSONResponse({"ok": False, "error": "corpo"}, status_code=400)

    row = loja.ficheiro(one_line(payload.get("id"), 40))
    if not row or not _pasta_visivel(row["pasta"], email, dono):
        return JSONResponse({"ok": False, "error": "inexistente"}, status_code=404)
    # Um cliente tira o que pôs; o dono arruma a pasta toda. Ninguém
    # apaga o que outra pessoa deixou numa pasta que não é sua.
    if not dono and row["por"] != email.strip().lower():
        return JSONResponse({"ok": False, "error": "dono"}, status_code=403)

    await loja.remover_ficheiro(row["id"])
    print("[ficheiros] ficheiro removido de uma pasta partilhada")
    return JSONResponse({"ok": True})


# ── Descarregar ──────────────────────────────────────────────────────
_ASCII = re.compile(r"[^\x20-\x7e]")


def _disposicao(nome: str, inline: bool) -> str:
    """O nome verdadeiro vai em `filename*`, que aceita UTF-8; o
    `filename` cru fica com uma versão em ASCII para quem não o leia.
    As aspas e a barra saem dos dois — num cabeçalho, são sintaxe."""
    simples = _ASCII.sub("_", nome).replace('"', "").replace("\\", "") or "ficheiro"
    return f"{'inline' if inline else 'attachment'}; filename=\"{simples}\"; filename*=UTF-8''{quote(nome, safe='')}"


@router.get("/api/ficheiros/abrir/{ficheiro_id}")
async def abrir(request: Request, ficheiro_id: str) -> Response:
    # `Response` e não `JSONResponse | FileResponse`: o FastAPI lê esta
    # anotação para decidir se tem de construir um modelo de resposta, e
    # uma união de dois tipos não é uma classe que ele reconheça como
    # `Response` — passaria a tentar validar bytes como JSON.
    email, dono, error = _sessao(request)
    if error:
        return error
    error = _limite(request)
    if error:
        return error

    row = loja.ficheiro(ficheiro_id)
    if not row or not _pasta_visivel(row["pasta"], email, dono):
        return JSONResponse({"ok": False, "error": "inexistente"}, status_code=404)

    chave = loja.chave({"pasta": row["pasta"], "id": row["id"]})

    # `inline` só para o que o browser mostra sem perigo, e sempre com
    # `nosniff`: é o par que impede um ficheiro de cliente de ser
    # interpretado como outra coisa na nossa própria origem.
    visivel = row["tipo"] in VISIVEIS or row["tipo"].startswith("text/")
    inline = visivel and request.query_params.get("descarregar") != "1"
    cabecalhos = {
        "Content-Disposition": _disposicao(row["nome"], inline),
        "X-Content-Type-Options": "nosniff",
        "Cache-Control": "private, no-store",
    }

    # Com o armazém em disco entrega-se o ficheiro sem o ler para
    # memória — o `FileResponse` trata do resto (intervalos incluídos).
    local = armazem.caminho_local(chave)
    if local:
        return FileResponse(local, media_type=_tipo_servido(row["tipo"]), headers=cabecalhos)

    # Com o armazém em S3, os bytes passam por aqui de propósito. Uma
    # ligação assinada era mais barata, mas vivia sozinha durante o
    # tempo de validade dela: quem a apanhasse abria o ficheiro sem
    # sessão nenhuma, e o que este endpoint existe para garantir é
    # exactamente o contrário.
    dados = await armazem.ler(chave)
    if dados is None:
        return JSONResponse({"ok": False, "error": "inexistente"}, status_code=404)
    return Response(dados, media_type=_tipo_servido(row["tipo"]), headers=cabecalhos)
