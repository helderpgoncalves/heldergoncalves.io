# ─────────────────────────────────────────────────────────────────────
# A API de heldergoncalves.io.
#
# Um processo só: serve o que o Astro gerou, recebe uma mensagem de
# contacto, gere as subscrições do blog, responde nas Mensagens, fala
# MCP, dá cotações da Bolsa e marca reuniões no Calendário.
#
# Este ficheiro é só o mapa. Cada família de rotas vive no seu router,
# em routers/; acrescentar um endpoint é escrever esse router e incluí-
# -lo aqui. Nenhuma lógica de negócio neste ficheiro.
#
# Nenhuma chave chega ao browser: vivem todas em config.py, a ler
# variáveis de ambiente. Se uma faltar, a funcionalidade responde
# "indisponível" e o site continua a funcionar sem ela.
# ─────────────────────────────────────────────────────────────────────
import asyncio
import resource
from contextlib import asynccontextmanager

from fastapi import FastAPI
from starlette.requests import Request
from starlette.responses import JSONResponse, Response

from app import security, sessions
from app.config import (
    CHAT,
    CHAT_READY,
    GOOGLE_READY,
    MAIL,
    MAIL_READY,
    NEWSLETTER_READY,
    OWNER_EMAIL,
    ROOT,
    SITE_ORIGIN,
)
from app.availability_store import init_availability_store
from app.chat_store import init_chat_store
from app.comments_store import init_comments_store
from app.meetings import init_meetings
from app.reactions_store import init_reactions_store
from app.routers import agenda, auth, bolsa, chat, comments, contact, health, inbox, mcp, oauth_google, pessoas, reunioes, subscribe, token
from app.security import SECURITY_HEADERS
from app.sessions import init_sessions
from app.static_files import cache_stats, handle_static, warm_cache
from app.subscribers import init_subscribers
from app.users_store import init_users_store

# A limpeza periódica dos limites por visitante e dos códigos por
# arranque. Cinco minutos chegam: nada aqui é urgente, e o que fica por
# limpar entre corridas está limitado por MAX_KEYS de qualquer forma.
SWEEP_INTERVAL = 300


async def _sweeper() -> None:
    while True:
        await asyncio.sleep(SWEEP_INTERVAL)
        security.sweep(SWEEP_INTERVAL)
        sessions.sweep_codes()


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_subscribers()
    await init_sessions()
    await init_users_store()
    await init_meetings()
    await init_availability_store()
    await init_chat_store()
    await init_comments_store()
    await init_reactions_store()
    health.prime_health()

    estado = lambda ligado, como_ligado, como_desligado: f"ativo ({como_ligado})" if ligado else como_desligado

    print(f"heldergoncalves.io a servir {ROOT}")
    print(f"origem:     {SITE_ORIGIN}")
    print("contacto:   " + estado(MAIL_READY, MAIL.provider, "inativo, o site usa mailto:"))
    print("newsletter: " + estado(NEWSLETTER_READY, MAIL.provider, "inativa, precisa do email configurado"))
    print("conversa:   " + estado(CHAT_READY, CHAT.model, "inativa, as Mensagens usam respostas guardadas"))
    print("reuniões:   " + estado(MAIL_READY, "código por email", "inativas, precisam do email configurado"))
    print("dono:       " + estado(bool(OWNER_EMAIL), "configurado", "ninguém — sem OWNER_EMAIL, o Calendário fica só no modo de visitante"))
    print("google:     " + estado(GOOGLE_READY, "cliente configurado", "inativo, só o código por email entra"))
    print("bolsa:      ativa (yfinance)")

    files, bytes_ = await asyncio.to_thread(warm_cache)
    if files:
        held = cache_stats()
        usage_kb = resource.getrusage(resource.RUSAGE_SELF).ru_maxrss
        print(
            f"cache:      {files} ficheiros, {bytes_ // 1024} KB pré-carregados "
            f"({held['files']} em cache, {held['bytes'] // 1024} KB) — RSS {usage_kb // 1024} MB"
        )

    sweeper = asyncio.create_task(_sweeper())
    try:
        yield
    finally:
        sweeper.cancel()


app = FastAPI(title="heldergoncalves.io", docs_url=None, redoc_url=None, openapi_url=None, lifespan=lifespan)


@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    """Vão em todas as respostas, sem excepção — inclusive nas que o
    FastAPI gera sozinho (404, 422, erros não apanhados)."""
    response: Response = await call_next(request)
    for name, value in SECURITY_HEADERS.items():
        response.headers.setdefault(name, value)
    return response


# ── As rotas ─────────────────────────────────────────────────────────
for router in (
    health.router,
    token.router,
    contact.router,
    subscribe.router,
    chat.router,
    bolsa.router,
    auth.router,
    oauth_google.router,
    reunioes.router,
    agenda.router,
    inbox.router,
    comments.router,
    pessoas.router,
    mcp.router,
):
    app.include_router(router)


# O que o Astro gerou — sempre por último: qualquer caminho que nenhuma
# rota acima reconheça é ou um ficheiro estático, ou um 404 a sério.
@app.get("/{full_path:path}")
@app.head("/{full_path:path}")
async def static_catch_all(request: Request, full_path: str) -> Response:
    if full_path.startswith("api/"):
        return JSONResponse({"ok": False, "error": "rota"}, status_code=404)
    return await handle_static(request)
