---
paths:
  - "server/**/*.mjs"
---

# O servidor

Zero dependências, e é para continuar assim. Se uma coisa precisa de um
pacote, ou se escreve, ou não se faz.

## Onde cada coisa vive

Cada ficheiro tem um assunto, e só um. Pôr lógica no sítio errado é o
que faz um servidor de 936 linhas.

| | |
| --- | --- |
| `config.mjs` | **o único ficheiro que lê `process.env`.** Se leres uma variável de ambiente noutro sítio, está errado. |
| `http.mjs` | responder, ler o corpo, e limpar o que vem de fora |
| `security.mjs` | cabeçalhos, limites por visitante, tokens |
| `static.mjs` | os ficheiros que o Astro gerou |
| `mail.mjs` | entregar email — o contrato é `true`/`false` |
| `knowledge.mjs` | o que o assistente sabe, e a pesquisa |
| `subscribers.mjs` | a lista da newsletter |
| `copy.mjs` | o texto das páginas que não passam pelo Astro |
| `agent/` | o prompt e as ferramentas do assistente |
| `routes/` | uma rota, um ficheiro |
| `index.mjs` | a tabela de rotas, e mais nada |

## Invariantes

- **Nenhum texto de fora chega a lado nenhum sem passar por `clean` ou
  `oneLine`.** É em `http.mjs` que isso se decide, e só lá.
- **Todos os `console.log` dizem que aconteceu, nunca o quê.** Nada de
  emails, mensagens ou IPs nos logs.
- **O IP nunca é guardado em claro.** `ipKey(req)` devolve uma impressão
  digital HMAC que morre com o processo.
- **A lista de subscritores nunca é servida por HTTP.** Não há endpoint
  que a devolva, nem sequer para a contar.
- **Uma ferramenta do agente nunca lança.** Uma falha é uma frase que diz
  o que correu mal e o que fazer a seguir — o modelo vai ler aquilo.
- **O servidor não comprime nada em tempo de pedido.** Quem comprime é
  `scripts/precompress.mjs`, no build, e à qualidade máxima. O
  `static.mjs` só lê o `.br` ou o `.gz` que já lá está. O caminho de
  recurso — comprimir à pressa — existe para quem corre sem passar pelo
  build, e não deve ser o normal.
- **Se uma funcionalidade não estiver configurada, responde `503` e o
  site continua.** O contacto volta ao `mailto:`, as Mensagens usam as
  respostas guardadas. Nunca se perde nada.

## Um endpoint que recebe alguma coisa

Pela ordem, e nenhuma se salta:

1. a funcionalidade está ligada? senão `503`
2. `wrongOrigin(req, SITE_ORIGIN)` — origem e `content-type`
3. `bump(...)` por visitante **e** global — senão `429`
4. `readJson(req)` — senão `400`
5. a armadilha (`payload.company`) — se vier preenchida, responde `200`
   e não faz nada; o robô não pode perceber que foi apanhado
6. `checkToken(...)` — senão `400`
7. só agora se valida o conteúdo

Os números todos vivem em `LIMITS`, em `config.mjs`. Nenhum número
mágico espalhado pelo código.

## Segredos

`security.mjs` gera o seu segredo a cada arranque, de propósito:
reiniciar invalida os tokens antigos.

A excepção é o da newsletter, que **tem** de sobreviver a reinícios —
uma ligação de confirmação já enviada tem de continuar a valer amanhã.
Vive em `subscribers.mjs`, vem de `SUBSCRIBE_SECRET` ou é gerado e
guardado ao lado da lista.

## Ao acrescentar uma rota

Ver `/nova-rota`. Em resumo: um ficheiro em `routes/`, uma linha na
tabela do `index.mjs`, e o `DEPLOY.md` actualizado se trouxer variáveis
de ambiente novas.
