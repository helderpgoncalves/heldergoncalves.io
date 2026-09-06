# ─────────────────────────────────────────────────────────────
# heldergoncalves.io — Astro no stage 1, servido no stage 2 por um
# servidor Node escrito à mão (server/index.mjs): ficheiros estáticos,
# cabeçalhos de segurança e o endpoint de contacto, sem dependências.
# Pronto para Coolify (build pack: Dockerfile — deteta o EXPOSE 3000).
# ─────────────────────────────────────────────────────────────

# ── Stage 1 — build ──────────────────────────────────────────
FROM node:22-alpine AS build
WORKDIR /app

# Instala dependências. `npm install` (não `npm ci`) resolve de forma
# tolerante deps opcionais específicas da plataforma linux do container
# — o lockfile pode ter sido gerado noutra plataforma. Para um site
# estático é seguro e mantém o build reprodutível em qualquer host.
COPY package.json package-lock.json* ./
RUN npm install --no-audit --no-fund

# Copia o resto e gera o site estático em /app/dist.
COPY . .
RUN npm run build

# ── Stage 2 — runtime (o nosso servidor, zero dependências) ──
FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production

# Só o output estático e o servidor. Nada de npm install aqui: o
# servidor usa apenas módulos internos do Node, o que significa zero
# dependências de terceiros a correr em produção.
COPY --from=build /app/dist ./dist
COPY server ./server
COPY knowledge ./knowledge

# Corre como utilizador sem privilégios.
USER node

# Coolify lê o EXPOSE para detetar a porta.
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -q --spider http://127.0.0.1:3000/ || exit 1

CMD ["node", "server/index.mjs"]
