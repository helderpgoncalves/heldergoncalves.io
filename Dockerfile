# ─────────────────────────────────────────────────────────────
# heldergoncalves.io — site estático (Astro) servido na porta 3000.
# Um único container, sem nginx: build no stage 1, servido por um
# servidor estático mínimo (`serve`) no stage 2. Pronto para Coolify
# (build pack: Dockerfile — deteta o EXPOSE 3000).
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

# ── Stage 2 — runtime (servidor estático) ────────────────────
FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production

# Servidor estático mínimo, instalado globalmente (sem package.json extra).
RUN npm install -g serve@14

# Copia apenas o output estático do build.
COPY --from=build /app/dist ./dist

# Corre como utilizador sem privilégios.
USER node

# Coolify lê o EXPOSE para detetar a porta.
EXPOSE 3000

# Health check — Coolify/Docker marcam o container como saudável quando responde.
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -q --spider http://127.0.0.1:3000/ || exit 1

# `serve` publica ./dist na porta 3000.
#  -l  : porta a ouvir
#  sem -s: site multi-página; rotas desconhecidas caem no dist/404.html
#  com estado 404 a sério (importante para SEO).
CMD ["serve", "dist", "-l", "3000"]
