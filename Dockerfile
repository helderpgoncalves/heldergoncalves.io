# ─────────────────────────────────────────────────────────────
# heldergoncalves.io — Astro no stage 1, servido no stage 2 por um
# servidor Node escrito à mão (server/index.mjs): ficheiros estáticos,
# cabeçalhos de segurança e o endpoint de contacto, sem dependências.
# Pronto para Coolify (build pack: Dockerfile — deteta o EXPOSE 3000).
# ─────────────────────────────────────────────────────────────

# ── Stage 1 — build ──────────────────────────────────────────
FROM node:24-alpine AS build
WORKDIR /app

# Instala dependências. `npm install` (não `npm ci`) resolve de forma
# tolerante deps opcionais específicas da plataforma linux do container
# — o lockfile pode ter sido gerado noutra plataforma. Para um site
# estático é seguro e mantém o build reprodutível em qualquer host.
COPY package.json package-lock.json* ./
RUN npm install --no-audit --no-fund

# Copia o resto e gera o site estático em /app/dist. O `npm run build`
# corre o Astro e a seguir a compressão: o `.br` e o `.gz` de cada
# ficheiro ficam prontos aqui, para o servidor nunca ter de comprimir.
COPY . .
RUN npm run build

# ── Stage 2 — runtime (o nosso servidor, zero dependências) ──
FROM node:24-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production

# Só o output estático e o servidor. Nada de npm install aqui: o
# servidor usa apenas módulos internos do Node, o que significa zero
# dependências de terceiros a correr em produção.
COPY --from=build /app/dist ./dist
COPY server ./server
COPY knowledge ./knowledge

# O npm não corre nada em produção: o CMD é `node` e mais nada. Tirá-lo
# poupa ~15 MB e deixa a imagem sem gestor de pacotes lá dentro.
RUN rm -rf /usr/local/lib/node_modules/npm /usr/local/bin/npm /usr/local/bin/npx

# A lista da newsletter vive aqui. Sem um volume montado neste caminho,
# a lista desaparece quando o container é substituído — ver DEPLOY.md.
RUN mkdir -p /app/data && chown node:node /app/data
VOLUME ["/app/data"]

# Corre como utilizador sem privilégios.
USER node

# Coolify lê o EXPOSE para detetar a porta.
EXPOSE 3000

# Nove bytes em vez da página inicial, de trinta em trinta segundos.
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -q --spider http://127.0.0.1:3000/healthz || exit 1

CMD ["node", "server/index.mjs"]
