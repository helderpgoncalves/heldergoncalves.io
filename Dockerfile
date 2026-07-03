# ─────────────────────────────────────────────────────────────
# heldergoncalves.io — build estático (Astro) servido por nginx.
# Multi-stage: imagem final pequena, sem Node em produção.
# Pronto para Coolify (build pack: Dockerfile).
# ─────────────────────────────────────────────────────────────

# ── Stage 1 — build ──────────────────────────────────────────
FROM node:22-alpine AS build
WORKDIR /app

# Instala dependências. Usa `npm install` (não `npm ci`) para resolver de
# forma tolerante deps opcionais específicas da plataforma linux do
# container — o lockfile é gerado noutra plataforma e o `ci` estrito rejeita
# transitivas resolvidas de forma diferente. Para um site estático, a
# tolerância do `install` é segura e torna o build reprodutível em qualquer host.
COPY package.json package-lock.json* ./
RUN npm install --no-audit --no-fund

# Copia o resto e gera o site estático em /app/dist.
COPY . .
RUN npm run build

# ── Stage 2 — runtime (nginx) ────────────────────────────────
FROM nginx:1.27-alpine AS runtime

# Config nginx própria (gzip, cache, headers de segurança, SPA fallback).
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copia apenas o output estático do build.
COPY --from=build /app/dist /usr/share/nginx/html

# Coolify lê o EXPOSE para detetar a porta (definir 80 na UI se preciso).
EXPOSE 80

# Health check — Coolify/Docker marcam o container como saudável quando responde.
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -q --spider http://127.0.0.1/ || exit 1

# nginx em foreground (obrigatório em container).
CMD ["nginx", "-g", "daemon off;"]
