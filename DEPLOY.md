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

Sem a chave, as Mensagens continuam a funcionar com as respostas guardadas —
diz-se isso por baixo da caixa de escrita, sem fingir.

**Quanto custa.** Por omissão usa o `anthropic/claude-opus-5`: 5 dólares por
milhão de tokens à entrada e 25 à saída. Cada resposta é curta (o servidor
limita a 400 tokens) e o teto diário é de 600 mensagens, por isso o pior caso
ronda os 5 dólares por dia — e só se alguém andar mesmo a martelar. Se quiseres
gastar cinco vezes menos, põe `OPENROUTER_MODEL=anthropic/claude-haiku-4.5`
(1 e 5 dólares por milhão). A escolha é tua; deixei o melhor por omissão.

> A chave **nunca** chega ao browser. O site só conhece `/api/contact`; quem
> fala com o fornecedor de email é o container.

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

## Cabeçalhos

O servidor envia, em todas as respostas: `Content-Security-Policy` (sem
`unsafe-inline` para scripts — por isso o arranque vive em
`public/os-early.js`), `X-Content-Type-Options`, `X-Frame-Options`,
`Referrer-Policy`, `Permissions-Policy`, `Cross-Origin-Opener-Policy`,
`Cross-Origin-Resource-Policy` e `Strict-Transport-Security`.

Também trata de ETag, `304`, gzip e cache longo para `/_astro/` (ficheiros com
hash no nome).

## Outras notas

- O domínio está em `astro.config.mjs` (`site`) — é de lá que saem o canonical,
  o sitemap e os URLs absolutos do Open Graph.
- A imagem de partilha é `public/og.png`. Trocar o ficheiro chega.
- Para máquinas: `/llms.txt`, `/en/llms.txt`, `/llms-full.txt` e `/posts.json`.
