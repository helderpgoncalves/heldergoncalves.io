---
name: nova-rota
description: Acrescenta um endpoint novo ao servidor, com os portões de segurança pela ordem certa. Usa quando alguém pedir uma API nova, um formulário que envie alguma coisa, um webhook, ou qualquer coisa em /api/.
disable-model-invocation: true
argument-hint: [nome-da-rota]
arguments: [nome]
---

# Rota nova: `$nome`

## 1. O ficheiro — `server/routes/$nome.mjs`

Um assunto por ficheiro. O que já existe reutiliza-se; nada se copia.

```js
import { LIMITS, SITE_ORIGIN, mailReady } from '../config.mjs';
import { clean, json, oneLine, readJson } from '../http.mjs';
import { bump, checkToken, ipKey, wrongOrigin } from '../security.mjs';

export async function handle$Nome(req, res, url) {
  // ...
}
```

## 2. Os portões, por esta ordem

Se a rota **recebe** alguma coisa, os sete passos fazem-se todos e por
esta ordem. Saltar um é abrir um buraco:

```js
if (!prontidao) return json(res, 503, { ok: false, error: 'indisponivel' });

const bad = wrongOrigin(req, SITE_ORIGIN);
if (bad) return json(res, bad === 'origem' ? 403 : 415, { ok: false, error: bad });

const key = ipKey(req);
if (!bump('$nome:' + key, LIMITS.xPerIpWindow, LIMITS.xPerIp)) return json(res, 429, { ok: false, error: 'limite' });
if (!bump('$nome:global', LIMITS.xGlobalWindow, LIMITS.xGlobal)) return json(res, 429, { ok: false, error: 'limite' });

const payload = await readJson(req);
if (!payload) return json(res, 400, { ok: false, error: 'corpo' });

// A armadilha: responde ok e não faz nada. O robô não pode perceber.
if (clean(payload.company, 200)) return json(res, 200, { ok: true });

const tokenError = checkToken(payload.token, key, { minAge: LIMITS.tokenMinAge, singleUse: true });
if (tokenError) return json(res, 400, { ok: false, error: tokenError });

// só agora se valida o conteúdo
```

Se a rota só **devolve** coisas, bastam a prontidão e os limites.

## 3. Os números — `server/config.mjs`

Todos os limites novos vão para `LIMITS`, com nome. **Nenhum número
mágico no ficheiro da rota.** Variáveis de ambiente novas também: é o
único ficheiro que lê `process.env`.

## 4. A tabela — `server/index.mjs`

Uma linha, e mais nada:

```js
{ path: '/api/$nome', methods: ['POST'], handler: handle$Nome },
```

Nenhuma lógica no `index.mjs`. Ele é o mapa.

## 5. O cliente

Se houver formulário, o token vem de `lib/session.js` — **um por
envio**, porque o servidor só aceita cada um uma vez. E a armadilha
precisa de existir no HTML: um campo escondido com `.sr`,
`tabindex="-1"` e `aria-hidden="true"`.

## 6. O DEPLOY.md

Se trouxe variáveis de ambiente, um volume, ou um limite que interesse a
quem opera, documenta-o lá. Uma rota que só existe no código é uma rota
que ninguém sabe configurar.

## Regras que não se dobram

- **Zero dependências.** Se precisa de um pacote, escreve-se.
- **Tudo o que vem de fora passa por `clean` ou `oneLine`.**
- **Os logs dizem que aconteceu, nunca o quê.** Nada de emails,
  mensagens ou IPs.
- **Sem configuração, responde `503` e o site continua a funcionar.**

## No fim

`/verificar`.
