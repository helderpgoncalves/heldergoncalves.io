# heldergoncalves.io

Um site pessoal que é um sistema operativo: macOS no computador, iOS no
telemóvel. Astro gera HTML estático; a interface é JavaScript escrito à mão;
a API é FastAPI (Python) — um processo só, em `api/app/`.

<!--
  Este ficheiro é o que tem de estar em contexto em TODAS as sessões.
  Regra para o manter pequeno (alvo: 150 linhas):
    - o que se deduz do código NÃO entra aqui — nem árvores de pastas,
      nem listas de dependências, nem descrições de arquitectura;
    - o que é de uma parte só do código vai para .claude/rules/, com
      `paths:`, e carrega sozinho quando se lá mexe;
    - o que é um procedimento vai para .claude/skills/, e carrega
      quando se invoca.
  Fica aqui só o que não se descobre a ler ficheiros: as invariantes,
  os porquês, e as armadilhas.
-->

## Antes de tudo

As regras da máquina estão em `~/CLAUDE.md` e **mandam sobre este
ficheiro**. Este ficheiro diz o que o projecto é; esse diz o que se
pode correr aqui. Em caso de conflito, ganha esse.

## As oito invariantes

Se uma alteração quebrar uma destas, está errada — mesmo que funcione.

1. **Dependências mínimas e todas justificadas.** `api/app/` só traz
   `fastapi`, `uvicorn`, `httpx`, `yfinance` e `tzdata` — cada uma por
   uma razão que se explica numa frase. O que se resolve com a
   biblioteca padrão do Python (segurança, datas) resolve-se com ela.
   Antes de acrescentar uma dependência nova: seria mesmo mais barato
   escrevê-lo?
2. **O site funciona sem JavaScript.** Todo o texto é HTML normal por
   baixo. O JS transforma o documento em sistema; não o cria.
3. **Nenhuma chave chega ao browser.** Segredos vivem em variáveis de
   ambiente, lidas só em `api/app/config.py`.
4. **As duas línguas andam a par.** `src/config/copy.pt.ts` e
   `copy.en.ts` têm exactamente as mesmas chaves. O TypeScript obriga.
5. **A geometria da Apple não se negoceia.** Cantos, escala de tipos e
   cores de sistema têm valores certos — ver `.claude/rules/apple.md`.
6. **Nenhum ficheiro passa das 400 linhas.** Quando um cresce, parte-se
   por assunto, não ao meio.
7. **`data/` nunca entra no repositório.** É a lista da newsletter, as
   reuniões marcadas e os segredos que assinam ligações e sessões. Vive
   num volume no servidor.
8. **Em produção não se calcula o que se pode calcular no build.** A
   compressão é o exemplo: comprime-se uma vez no build, à qualidade
   máxima, e o servidor só lê. Se acrescentares trabalho por pedido,
   pergunta primeiro se não pode ser feito antes.

## Comandos

| | |
| --- | --- |
| `npm run dev` | servidor de desenvolvimento do frontend (4321) |
| `npm run build` | gera `dist/` |
| `docker compose up --build` | o site a sério: `dist/` servido pela API, na 3000 |
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

## Convenções

- **Os comentários são em português.** Explicam *porquê*, não *o quê* —
  se o comentário repete o código, apaga-se. O README é em inglês, para
  quem chega ao repositório.
- **Nomes de ficheiro e de identificador em português** onde já é assim
  (`escritos`, `definicoes`, `subscrever`). Não se mistura.
- **Sem frameworks, sem bibliotecas de animação, sem tracking.** Isto
  não é uma preferência de estilo: é o que o projecto é.
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
  `asyncio.to_thread(...)`.
- **`Limits`, em `api/app/config.py`, não é `frozen` como os outros
  blocos de configuração** — de propósito, para os testes lhe mexerem
  (`token_min_age`, sobretudo) sem esperar pelo relógio a sério. Não é
  para se lhe mexer fora dos testes.
