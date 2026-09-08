# ─────────────────────────────────────────────────────────────
# heldergoncalves.io — Astro no stage 1, a API em FastAPI (api/) no
# stage 2: ficheiros estáticos, cabeçalhos de segurança, contacto,
# newsletter, o assistente das Mensagens, MCP, a Bolsa e o Calendário —
# um processo só. Pronto para Coolify (build pack: Dockerfile — deteta
# o EXPOSE 3000).
# ─────────────────────────────────────────────────────────────

# ── Stage 1 — o site estático ────────────────────────────────
FROM node:24-alpine AS build
WORKDIR /app

# `npm install` (não `npm ci`) resolve de forma tolerante deps
# opcionais específicas da plataforma linux do container — o lockfile
# pode ter sido gerado noutra plataforma. Para um site estático é
# seguro e mantém o build reprodutível em qualquer host.
COPY package.json package-lock.json* ./
RUN npm install --no-audit --no-fund

# Copia o resto e gera o site estático em /app/dist. O `npm run build`
# corre o Astro e a seguir a compressão: o `.br` e o `.gz` de cada
# ficheiro ficam prontos aqui, para a API nunca ter de comprimir nada
# em tempo de pedido.
COPY astro.config.mjs tsconfig.json ./
COPY public ./public
COPY src ./src
COPY scripts ./scripts
RUN npm run build

# ── Stage 2 — a API (FastAPI + uvicorn) ──────────────────────
FROM python:3.12-slim AS runtime
WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    HOME=/app

COPY api/requirements.txt ./api/requirements.txt
RUN pip install --no-cache-dir -r api/requirements.txt

COPY api/app ./app
COPY api/alembic ./alembic
COPY api/alembic.ini ./alembic.ini
COPY --from=build /app/dist ./dist
COPY knowledge ./knowledge

# A lista da newsletter e as reuniões vivem aqui. Sem um volume montado
# neste caminho, desaparecem quando o container é substituído — ver
# DEPLOY.md.
RUN useradd --system --uid 1001 site \
    && mkdir -p /app/data \
    && chown -R site /app
VOLUME ["/app/data"]

USER site

# Coolify lê o EXPOSE para detetar a porta.
EXPOSE 3000

# `/healthz` confirma que há um index.html para servir — não só que o
# processo está vivo. O start-period é curto porque a API atende antes
# de aquecer a cache: fica verde no segundo em que está mesmo pronta.
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD python3 -c "import urllib.request; urllib.request.urlopen('http://127.0.0.1:3000/healthz', timeout=2)" || exit 1

# Um processo só: os limites por visitante e as caches vivem em
# memória, e mais do que um worker deixava de os partilhar. As
# migrações do Alembic correm sempre antes — `upgrade head` é
# idempotente, por isso um arranque com a base de dados já em dia não
# faz nada.
CMD ["sh", "-c", "alembic upgrade head && exec uvicorn app.main:app --host 0.0.0.0 --port 3000 --workers 1 --no-access-log"]
