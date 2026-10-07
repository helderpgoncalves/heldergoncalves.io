# syntax=docker/dockerfile:1
# Imagem pequena e com pouca RAM: Next em modo `standalone`, um só processo Node, utilizador sem privilégios.

FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

FROM node:22-alpine AS build
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# As fontes (Geist, Newsreader, Instrument Serif) são descarregadas do Google aqui, uma vez,
# e ficam dentro da imagem: em produção o site não fala com o Google.
RUN npm run build

FROM node:22-alpine AS run
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0 \
    NODE_OPTIONS=--max-old-space-size=160
WORKDIR /app
# Sem npm/yarn na imagem final: só o Node. Menos peso e menos coisas para atacar.
RUN addgroup -S app && adduser -S app -G app \
 && rm -rf /usr/local/lib/node_modules /usr/local/bin/npm /usr/local/bin/npx /opt/yarn* /usr/local/bin/yarn* /usr/local/bin/corepack \
 && mkdir /data && chown app:app /data
# Os dados das mini-apps (ex.: os comentários do chat da Microsoft) vivem aqui: no Coolify, este caminho
# tem de ser um volume persistente, senão perdem-se a cada deploy.
ENV DATA_DIR=/data

COPY --from=build --chown=app:app /app/.next/standalone ./
COPY --from=build --chown=app:app /app/.next/static ./.next/static
COPY --from=build --chown=app:app /app/public ./public
# O que o aviso automático de artigos (scripts/notificar.mjs) precisa em execução. O Next só leva
# para o standalone o que o servidor importa, e as páginas já vêm geradas: estes dois ficam de fora.
COPY --from=build --chown=app:app /app/node_modules/yaml ./node_modules/yaml
COPY --from=build --chown=app:app /app/node_modules/marked ./node_modules/marked
COPY --from=build --chown=app:app /app/node_modules/highlight.js ./node_modules/highlight.js
COPY --from=build --chown=app:app /app/content ./content
COPY --from=build --chown=app:app /app/lib/md.mjs /app/lib/email.mjs ./lib/
COPY --from=build --chown=app:app /app/scripts/notificar.mjs ./scripts/notificar.mjs

USER app
EXPOSE 3000

# O Coolify usa este HEALTHCHECK (a imagem tem wget). Sem resposta, não troca de versão.
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3000/api/health >/dev/null || exit 1

CMD ["node", "server.js"]
