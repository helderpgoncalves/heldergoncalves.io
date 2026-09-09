# heldergoncalves.io

Um site pessoal que é um sistema operativo: macOS no computador, iOS no
telemóvel. Astro gera HTML estático; a interface é JavaScript escrito à mão;
a API é FastAPI (Python) — um processo só, em `api/app/`. Uma conta (Google
ou magic link) abre uma plataforma por trás disso: reuniões, mensagens com
um bot que sabe quando chamar o Hélder, orçamentos de projectos, um Finder
com todos os contactos, e o blog com comentários. O desenho completo está em
**[`docs/arquitetura.md`](docs/arquitetura.md)** — lê-o antes de tocar em
contas, Postgres, ou qualquer app nova destas.

<!--
  Este ficheiro é o que tem de estar em contexto em TODAS as sessões.
  Regra para o manter pequeno (alvo: 150 linhas):
    - o que se deduz do código NÃO entra aqui — nem árvores de pastas,
      nem listas de dependências, nem descrições de arquitectura;
    - o que é de uma parte só do código vai para .claude/rules/, com
      `paths:`, e carrega sozinho quando se lá mexe;
    - o que é um procedimento vai para .claude/skills/, e carrega
      quando se invoca;
    - o que é o desenho da plataforma (contas, Postgres, cada app nova)
      vai para docs/arquitetura.md, e lê-se antes de mexer nisso.
  Fica aqui só o que não se descobre a ler ficheiros: as invariantes,
  os porquês, e as armadilhas.
-->

## Antes de tudo

As regras da máquina estão em `~/CLAUDE.md` e **mandam sobre este
ficheiro**. Este ficheiro diz o que o projecto é; esse diz o que se
pode correr aqui. Em caso de conflito, ganha esse.

## As nove invariantes

Se uma alteração quebrar uma destas, está errada — mesmo que funcione.
Ver `docs/arquitetura.md` para o raciocínio por trás de cada uma.

1. **Dependências mínimas e todas justificadas.** Cada uma explica-se
   numa frase — ver a lista completa (incluindo o que Postgres e MinIO
   trazem) em `docs/arquitetura.md`. O que se resolve com a biblioteca
   padrão do Python resolve-se com ela. Tailwind CSS é a única excepção
   a "sem frameworks" — ver Convenções.
2. **O site público funciona sem JavaScript.** Home, escritos, o
   portefólio da Bolsa — todo o texto é HTML normal por baixo. As
   áreas que exigem sessão (Mensagens, Reuniões, Contactos) exigem
   naturalmente JavaScript para autenticar; o que não pode é partir o
   que é público.
3. **Nenhuma chave chega ao browser.** Segredos vivem em variáveis de
   ambiente, lidas só em `api/app/config.py` — inclui agora
   `DATABASE_URL`, OpenRouter, MinIO, e mais tarde Stripe.
4. **As duas línguas andam a par.** `src/config/copy.pt.ts` e
   `copy.en.ts` têm exactamente as mesmas chaves. O TypeScript obriga.
5. **A geometria da Apple não se negoceia.** Cantos, escala de tipos e
   cores de sistema têm valores certos — ver `.claude/rules/apple.md`.
   Vale para as áreas novas tal como para as antigas.
6. **Nenhum ficheiro passa das 400 linhas.** Quando um cresce, parte-se
   por assunto, não ao meio.
7. **Nada que seja segredo ou dado de visitante entra no repositório.**
   O volume do Postgres, o *bucket* do MinIO, qualquer `.env` — o
   mesmo princípio que já protegia `data/`, agora mais alargado.
8. **Em produção não se calcula o que se pode calcular no build.** A
   compressão é o exemplo: comprime-se uma vez no build, à qualidade
   máxima, e o servidor só lê. Se acrescentares trabalho por pedido,
   pergunta primeiro se não pode ser feito antes.
9. **Sem tracking de terceiros.** Nada de Google Analytics, Meta Pixel
   ou equivalente. O que o site regista sobre um visitante logado é o
   rasto funcional de usar as apps (marcou uma reunião, abriu uma
   conversa) — nunca telemetria de comportamento recolhida por rotina.

## Comandos

| | |
| --- | --- |
| `npm run dev` | servidor de desenvolvimento do frontend (4321) |
| `npm run build` | gera `dist/` |
| `docker compose -f docker-compose.dev.yml up --build` | ambiente de desenvolvimento com hot reload, Postgres incluído |
| `docker compose up --build` | o site a sério: `dist/` servido pela API, na 3000 |
| `cd api && alembic upgrade head` | aplica as migrações pendentes |
| `cd api && pytest` | a suite de testes da API — **não corre nesta máquina**, ver `~/CLAUDE.md` |
| `/verificar` | as verificações estáticas deste repo — **usa isto** |

`/verificar` corre em menos de um segundo, sem instalar nada: confere
tamanhos de ficheiro, se os imports batem certo com os exports (incluindo
os da API, em Python, via `ast`), se o CSS está equilibrado, se as duas
línguas têm as mesmas chaves, e se não entrou nenhum segredo. É o que se
corre nesta máquina; os testes a sério (`pytest`) correm no CI.

## Onde se acrescenta uma coisa

Está tudo feito para que a resposta seja aborrecida.

| Quero… | Uso |
| --- | --- |
| uma aplicação nova | `/nova-app` |
| um endpoint novo na API | `/nova-rota` |
| um escrito novo no blog | `/novo-escrito` |
| ensinar uma coisa ao assistente | criar um `.md` em `knowledge/` — não há código a mexer |
| mudar um texto | `src/config/copy.pt.ts` **e** `copy.en.ts` (os do sistema em `os.pt.ts` e `os.en.ts`) |
| um widget novo | um `<template>` em `Widgets.astro`, uma linha em `widgets.js`, o nome nas duas línguas |
| mudar o ícone do site | só `public/favicon.svg` — os PNG (Apple touch icon, PWA) saem dele no build, em `scripts/icones.mjs` |
| uma tabela nova em Postgres | uma revisão do Alembic em `api/alembic/versions/` — nunca um `CREATE TABLE` corrido à mão |
| perceber o desenho de Reuniões, Mensagens, Bolsa, Contactos ou Doações | `docs/arquitetura.md`, secção "As apps, por domínio" |

## Convenções

- **Os comentários são em português.** Explicam *porquê*, não *o quê* —
  se o comentário repete o código, apaga-se. O README é em inglês, para
  quem chega ao repositório.
- **Nomes de ficheiro e de identificador em português** onde já é assim
  (`escritos`, `definicoes`, `subscrever`). Não se mistura.
- **Tailwind CSS para utilities e layout; sem outros frameworks, sem
  bibliotecas de animação.** O CSS à mão em `src/styles/os/` fica para
  o que uma utility não alcança: cantos contínuos (`@utility` em
  `apple-cantos-*.css`), vidro/Liquid Glass, concentricidade, e as
  container queries próprias de cada app. Isto não é uma preferência
  de estilo: é o que o projecto é.
- **Aspas simples, ponto e vírgula, 2 espaços.** Como o resto.
- **Commits e push só quando forem pedidos.** A mensagem explica a
  decisão, não lista os ficheiros.

## Armadilhas que já morderam

- **Os textos das apps têm de ir para `osData.strings`** no `Shell.astro`.
  Uma app cujo texto não chega ao JavaScript rebenta ao arrancar com um
  `Cannot read properties of undefined` — já aconteceu com a Bolsa.
- **`corner-shape` não se herda.** Um pseudo-elemento com
  `border-radius: inherit` segue o raio mas não a forma. Precisa também
  de `corner-shape: inherit`, senão o aro do vidro sai redondo à volta
  de um canto contínuo.
- **`.claude/settings.json` é partilhado; `settings.local.json` é da
  máquina.** O que impede builds aqui é local — pôr isso no ficheiro
  partilhado quebrava o repositório para quem o clonasse.
- **Os módulos do `mac/` e do `ios/` chamam-se em círculo** (abrir uma
  app fecha os painéis; o comutador abre apps). Fazem-no através do
  objecto partilhado — `desk` e `ph` — nunca por importação directa.
  Uma importação directa entre eles é um ciclo.
- **`prefers-reduced-motion` e `prefers-reduced-transparency` são para
  respeitar**, não para ignorar. Já estão ligados; não os desfaças ao
  acrescentar animações.
- **Uma chamada bloqueante na API trava a API inteira**, não só quem a
  pediu — só há um processo `uvicorn` (`--workers 1`, de propósito: os
  limites por visitante vivem em memória). O `yfinance` é bloqueante;
  por isso `api/app/bolsa/client.py` só se chama de dentro de
  `asyncio.to_thread(...)`. A mesma regra vale para Postgres (driver
  assíncrono, nunca `psycopg2` síncrono) e para o cliente do MinIO.
- **`Limits`, em `api/app/config.py`, não é `frozen` como os outros
  blocos de configuração** — de propósito, para os testes lhe mexerem
  (`token_min_age`, sobretudo) sem esperar pelo relógio a sério. Não é
  para se lhe mexer fora dos testes.
- **"Dono" é `OWNER_EMAIL` comparado à sessão, nunca uma coluna
  `role`.** Antes de acrescentar uma tabela de permissões, ler
  `docs/arquitetura.md#duas-contas-um-sistema` — é uma decisão já
  tomada, não um detalhe em falta.
