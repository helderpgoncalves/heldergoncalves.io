# Deploy

Um container. O `Dockerfile` faz o build do Astro no primeiro stage e, no
segundo, corre `server/index.mjs` — um servidor Node **sem dependências**
que serve o `dist/`, põe os cabeçalhos de segurança e recebe o formulário
de contacto. Porta 3000.

1. Novo recurso → **Public Repository** → `https://github.com/helderpgoncalves/heldergoncalves.io`
2. Build pack: **Dockerfile** (deteta o `EXPOSE 3000`)
3. Domínio: `https://heldergoncalves.io`

Cada push para `main` refaz o site.

## Variáveis de ambiente

Nenhuma é obrigatória. **Sem elas o site funciona na mesma** — o formulário
de contacto abre a aplicação de email do visitante (`mailto:`) em vez de
enviar pelo servidor.

Para o envio funcionar a sério, no Coolify (Environment Variables):

| Variável          | Exemplo                        | Para quê                                    |
| ----------------- | ------------------------------ | ------------------------------------------- |
| `MAIL_PROVIDER`   | `resend`                       | `resend` ou `webhook`                       |
| `RESEND_API_KEY`  | `re_...`                       | chave do Resend — **só aqui, nunca no site** |
| `MAIL_FROM`       | `site@heldergoncalves.io`      | remetente verificado no Resend              |
| `MAIL_TO`         | `helder@heldergoncalves.io`    | para onde chega                             |
| `SITE_ORIGIN`     | `https://heldergoncalves.io`   | origem aceite no formulário                 |
| `TRUST_PROXY`     | `1`                            | usar o `X-Forwarded-For` do Traefik          |

Alternativa sem Resend: `MAIL_PROVIDER=webhook` e `MAIL_WEBHOOK_URL=https://…`
(n8n, Make, Zapier). O servidor faz `POST` com `{from, subject, message}`.

Para a aplicação Mensagens responder a sério (OpenRouter):

| Variável              | Exemplo                            | Para quê                      |
| --------------------- | ---------------------------------- | ----------------------------- |
| `OPENROUTER_API_KEY`  | `sk-or-v1-...`                     | **só aqui, nunca no site**    |
| `OPENROUTER_MODEL`    | `anthropic/claude-opus-5`          | opcional; é este por omissão  |

E, se quiseres que o agente consiga marcar conversas:

| Variável              | Exemplo                            | Para quê                        |
| --------------------- | ---------------------------------- | ------------------------------- |
| `BOOKING_URL`         | `https://cal.com/helder/30min`     | o agente dá a ligação           |
| `BOOKING_WEBHOOK_URL` | `https://…`                        | o agente regista o pedido       |

Sem nenhuma das duas, um pedido de reunião chega-te por email (se o envio
estiver ligado) ou o agente encaminha para o teu endereço. Nunca fica no ar.

Sem a chave do OpenRouter, as Mensagens continuam a funcionar com as respostas
guardadas — diz-se isso por baixo da caixa de escrita, sem fingir.

**Quanto custa.** Por omissão usa o `anthropic/claude-opus-5`: 5 dólares por
milhão de tokens à entrada e 25 à saída. Cada resposta é curta (o servidor
limita a 400 tokens) e o teto diário é de 600 mensagens, por isso o pior caso
ronda os 5 dólares por dia — e só se alguém andar mesmo a martelar. Se quiseres
gastar cinco vezes menos, põe `OPENROUTER_MODEL=anthropic/claude-haiku-4.5`
(1 e 5 dólares por milhão). A escolha é tua; deixei o melhor por omissão.

> A chave **nunca** chega ao browser. O site só conhece `/api/contact`; quem
> fala com o fornecedor de email é o container.

## Newsletter

A subscrição do blog usa o mesmo fornecedor de email do contacto: se o
contacto estiver ligado, a subscrição também está. Não há variável nova
obrigatória — mas há **um volume**, e sem ele a lista desaparece.

| Variável             | Exemplo                        | Para quê                                      |
| -------------------- | ------------------------------ | --------------------------------------------- |
| `DATA_DIR`           | `/app/data`                    | onde vive a lista; é este por omissão          |
| `SUBSCRIBERS_FILE`   | `/app/data/subscribers.ndjson` | o ficheiro em si; opcional                     |
| `SUBSCRIBE_SECRET`   | uma frase longa e aleatória    | assina as ligações de confirmação e de saída   |

**O volume.** No Coolify, monta um volume persistente em `/app/data`. Sem
ele, a lista vive dentro do container e desaparece no próximo deploy.

**O segredo.** Se não definires `SUBSCRIBE_SECRET`, o servidor gera um na
primeira vez e guarda-o em `/app/data/.subscribe-secret` — o que funciona,
desde que o volume esteja montado. Definir a variável é mais seguro e é o
que deves fazer se um dia correres mais do que um container.

**A lista.** É um NDJSON: uma linha por acontecimento, sempre acrescentada
ao fim. O estado de cada email é o da última linha que fala dele.

```bash
# quem está mesmo subscrito, sem repetições
docker exec -it <container> node -e '
  const fs = require("fs"), m = new Map();
  for (const l of fs.readFileSync("/app/data/subscribers.ndjson","utf8").split("\n"))
    if (l.trim()) { const r = JSON.parse(l); m.set(r.email, r); }
  for (const r of m.values()) if (r.status === "active") console.log(r.email, r.lang);
'
```

Nenhum endpoint devolve a lista — nem sequer para a contar. Quem a quer,
lê o ficheiro no servidor.

## O que protege a subscrição

O mesmo que protege o contacto, mais uma coisa que é a que interessa:

- **Dupla confirmação.** Pedir não inscreve ninguém. Manda um email com uma
  ligação assinada (HMAC sobre o email e o instante), e é a ligação que
  inscreve. Escrever o email de outra pessoa não a inscreve.
- **A ligação de confirmação vale sete dias.** A de saída **nunca expira** —
  uma pessoa tem de poder sair de uma lista a partir de um email antigo.
- **Não há tabela de tokens.** A assinatura basta-se: reiniciar o servidor
  não invalida ligações já enviadas, e não há nada a crescer em memória.
- **Não se diz quem já lá está.** Pedir a subscrição de um email já activo
  responde exactamente o mesmo que pedir a de um novo — dizer "esse já cá
  está" seria contar a um estranho quem subscreveu.
- **Limites**: 3 pedidos por IP por hora, 120 no total por hora.

## Calendário e Bolsa

**A Bolsa** tem dois níveis. Sem nada configurado, o servidor Node vai
ele próprio buscar o gráfico ao Yahoo Finance (sem chave) e guarda cada
resposta um minuto — dá cotações e séries, mas não a ficha nem as
notícias. Com a API da Bolsa ligada (`api/`, um serviço em Python à
parte, com FastAPI e o `yfinance`), o servidor passa a perguntar-lhe a
ela, e a aplicação fica completa: estatísticas, «Acerca» e notícias.

**A API não tem domínio público.** É um segundo recurso no Coolify —
*Public Repository*, o mesmo repositório, *Build pack* Dockerfile, com
o directório base `/api` — sem domínio à frente. Os dois recursos
partilham a rede interna do projecto Coolify; `BOLSA_API_URL` é o nome
interno desse serviço, na porta 8000. Se a variável faltar ou a API não
responder, o servidor Node volta sozinho ao Yahoo directo — nada parte.

| Variável         | Exemplo                                              | Para quê                                    |
| ---------------- | ----------------------------------------------------- | -------------------------------------------- |
| `BOLSA_API_URL`  | `http://bolsa-api:8000`                              | a API da Bolsa, na rede interna do Coolify  |
| `STOCKS_SOURCE`  | `https://query1.finance.yahoo.com/v8/finance/chart/` | o recuo directo; é esta por omissão         |
| `STOCKS_TTL_MS`  | `60000`                                              | quanto tempo cada resposta do recuo vale    |

**O Calendário** deixa uma pessoa entrar com o email — recebe um código
de seis algarismos, sem palavra-passe — e marcar uma conversa numa hora
livre. Precisa do email ligado (é por onde vai o código) e do volume
em `/app/data` (é onde ficam as reuniões).

| Variável                 | Exemplo                        | Para quê                                          |
| ------------------------ | ------------------------------ | ------------------------------------------------- |
| `SESSION_SECRET`         | uma frase longa e aleatória    | assina os cookies de sessão; gerado se faltar     |
| `MEETINGS_FILE`          | `/app/data/meetings.ndjson`    | as reuniões; opcional                             |
| `MEETINGS_TZ`            | `Europe/Lisbon`                | o fuso da agenda                                  |
| `MEETINGS_DAYS`          | `1-5`                          | dias da semana (1 = segunda, 0 ou 7 = domingo)    |
| `MEETINGS_WINDOWS`       | `10:00-12:00,15:00-18:00`      | as janelas do dia                                 |
| `MEETING_MINUTES`        | `30`                           | a duração de cada conversa                        |
| `MEETINGS_HORIZON_DAYS`  | `60`                           | até quantos dias à frente se pode marcar          |
| `MEETINGS_NOTICE_HOURS`  | `12`                           | antecedência mínima                               |

Cada marcação manda dois emails: um a ti, com o email da pessoa em
*reply-to*, e um à pessoa, a confirmar. Desmarcar avisa-te também. Só
quem entrou vê a disponibilidade; quem não entrou vê o mês vazio e o
pedido do email.

Limites: 5 códigos por IP por hora, 15 tentativas de código por IP em
15 minutos e 5 por código, 3 reuniões por pessoa por dia.

## O healthcheck

`GET /healthz` devolve **200 `ok`** quando o site pode mesmo ser servido,
e **503 `no`** quando não. A diferença importa: um healthcheck que
responde `ok` só porque o processo está vivo deixa passar um deploy em
que a pasta do site não foi para lá — e o resultado é um site a devolver
404 a tudo, com o Coolify a dizer que está saudável.

Este confirma que há um `index.html` para servir. É uma chamada ao
sistema, em cache durante dez segundos, e a resposta são dois bytes.

O `Dockerfile` já o traz configurado:

```
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3
```

O Coolify lê isto do próprio container e não é preciso configurar nada.
Se preferires configurá-lo lá — *Health Checks*, no serviço — os valores
que batem certo com estes são:

| | |
| --- | --- |
| Path | `/healthz` |
| Port | `3000` |
| Method | `GET` |
| Expected status | `200` |
| Interval | `30` |
| Timeout | `3` |
| Retries | `3` |
| Start period | `5` |

**Porquê estes números.** O `start-period` é curto porque o servidor
começa a atender antes de aquecer a cache — fica pronto no segundo em
que está pronto, e não dez depois, o que encurta cada deploy. O
`interval` de 30 segundos com 3 tentativas quer dizer que uma falha real
é apanhada em menos de dois minutos, e que um soluço não deita o
container abaixo.

**Não uses `/` como healthcheck.** São 2880 páginas por dia para
responder a uma pergunta de sim ou não.

## O que protege o formulário

Tudo no servidor, porque tudo o que estiver no browser é público:

- **Limites**: 3 mensagens por IP em 15 minutos e 40 no total por hora. Acima
  disso responde `429` e não gasta chamadas ao fornecedor.
- **Token com prazo**: o formulário pede um token ao abrir; o servidor
  assina-o (HMAC) e recusa envios com menos de 3,5 segundos (robô), com mais
  de 45 minutos (repetição antiga) ou já usados (replay).
- **Armadilha invisível**: um campo que só um robô preenche. Responde "ok" e
  não envia nada.
- **Validação apertada**: corpo até 8 KB, email verificado, mensagem entre 10
  e 4000 caracteres, caracteres de controlo removidos.
- **O IP nunca é guardado em claro** — só uma impressão digital HMAC em
  memória, que desaparece quando o container reinicia.
- **Sem registo do conteúdo**: os logs dizem apenas que uma mensagem entrou.

Se quiseres um limite ainda antes do container, o Traefik do Coolify aceita
uma label no recurso:

```
traefik.http.middlewares.hg-rate.ratelimit.average=30
traefik.http.middlewares.hg-rate.ratelimit.burst=60
```

## O que protege a conversa

O mesmo servidor, os mesmos princípios — mas mais apertado, porque cada
mensagem custa dinheiro:

- **Limites**: 15 mensagens por IP por hora, 50 por dia, e um teto global de
  600 por dia. Passado isso responde `429` sem chamar o modelo.
- **Papel apertado**: o modelo só sabe o que está no site e só responde sobre
  isso. Recebe instruções para ignorar qualquer pedido, vindo do visitante,
  para mudar de regras, mudar de personagem ou revelar as instruções.
- **Entrada validada**: no máximo 8 mensagens de histórico, 600 caracteres
  cada, 4000 no total, corpo até 16 KB, e o servidor reconstrói o histórico a
  partir do que recebe em vez de confiar nele.
- **Saída limitada**: 400 tokens por resposta e um corte rígido aos 3000
  caracteres, para que nada corra em aberto.
- **O texto do modelo entra na página como texto**, nunca como HTML.
- **Nada é registado**: nem perguntas, nem respostas.

## O que o agente sabe

Tudo o que está em `knowledge/*.md`. Editar um ficheiro e fazer push é a
única coisa precisa para o ensinar — não há prompt escondido no código. As
regras estão em `knowledge/README.md`.

O agente tem três ferramentas: `procurar` (base de conhecimento e escritos),
`marcar_reuniao` e `enviar_mensagem`. No máximo duas rondas de ferramentas
por mensagem, para o custo não fugir.

## MCP

O site é também um servidor MCP, em `POST /mcp` (JSON-RPC 2.0). Um `GET`
no mesmo endereço descreve-o. Ferramentas: `procurar`, `escritos` e
`contactar`. Limite de 60 pedidos por IP à hora; o `contactar` usa os mesmos
limites do formulário de contacto.

## Cabeçalhos

O servidor envia, em todas as respostas: `Content-Security-Policy` (sem
`unsafe-inline` para scripts — por isso o arranque vive em
`public/os-early.js`), `X-Content-Type-Options`, `X-Frame-Options`,
`Referrer-Policy`, `Permissions-Policy`, `Cross-Origin-Opener-Policy`,
`Cross-Origin-Resource-Policy` e `Strict-Transport-Security`.

Também trata de ETag, `304`, gzip e cache longo para `/_astro/` (ficheiros com
hash no nome).

## Peso e velocidade em produção

O que corre no servidor é o mínimo, e é de propósito.

**Nada é comprimido em tempo de pedido.** O `npm run build` corre o Astro
e a seguir `scripts/precompress.mjs`, que escreve um `.br` e um `.gz` ao
lado de cada ficheiro de texto, com o Brotli na qualidade máxima (11).
Servir passa a ser ler bytes e mandá-los: zero CPU de compressão por
pedido, e melhor rácio do que era possível com alguém à espera.

**A cache aquece no arranque.** Depois de a porta abrir, o servidor lê o
HTML, o CSS e o JS para memória (com tectos: 120 ficheiros, 24 MB). Quem
chegar primeiro depois de um deploy não espera por I/O nenhum.

**A memória tem tectos, e todos.** O V8 dimensiona a heap a partir da
memória da máquina, por isso o container leva `--max-old-space-size=128`:
o pior caso passa a ser um número conhecido em vez de um número que
depende do host. A cache de ficheiros tem um orçamento de 24 MB e deita
fora o que há mais tempo não é pedido — sem isso, bastava o site crescer
para o processo ficar a segurar o disco inteiro. Os mapas de limites por
visitante têm tecto de 20 000 chaves, que é o que impede um ataque
distribuído de os fazer crescer entre duas limpezas.

O arranque diz quanto está a gastar:

```
memória:    52.4 MB no total, 11.2 MB de heap, 1.8 MB em 23 ficheiros
```

**Chega bem com 256 MB.** No Coolify, em *Resource Limits*, `256m` de
memória é folgado e `0.5` de CPU chega. Pôr um limite não é só arrumação:
sem ele, um pico leva a máquina toda em vez de levar só o container.

**A imagem não tem npm.** O `CMD` é `node` e mais nada, por isso o npm é
apagado da camada final: menos ~15 MB e sem gestor de pacotes dentro do
container de produção. Zero dependências de terceiros a correr.

**A imagem base é `node:24-alpine`**, a LTS activa. Sobe por Dependabot.

Se quiseres confirmar que a compressão está mesmo a sair do disco:

```bash
curl -sI -H 'Accept-Encoding: br' https://heldergoncalves.io/ | grep -i content-encoding
```

## Outras notas

- O domínio está em `astro.config.mjs` (`site`) — é de lá que saem o canonical,
  o sitemap e os URLs absolutos do Open Graph.
- A imagem de partilha é `public/og.png`. Trocar o ficheiro chega.
- O ícone do site é `public/favicon.svg`, e é o único desenho: os PNG do
  Apple touch icon e da PWA saem dele no build (`scripts/icones.mjs`), por
  isso em `npm run dev` não existem — só em `dist/`.
- Para máquinas: `/llms.txt`, `/en/llms.txt`, `/llms-full.txt` e `/posts.json`.
