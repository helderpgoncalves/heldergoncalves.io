# heldergoncalves.io

Site pessoal de Hélder Gonçalves. Não é uma página: é um **sistema operativo**.

- **No telemóvel** comporta-se como um iPhone — arranque com o monograma a
  desenhar-se, ecrã bloqueado que se desliza para abrir, ecrã inicial com duas
  páginas e widgets, aplicações que abrem a partir do próprio ícone, barra de
  gestos, Central de Controlo, Centro de Notificações e comutador de aplicações.
- **No computador** comporta-se como um Mac — barra de menus, Dock com
  ampliação, janelas que se arrastam, redimensionam e **encaixam nas margens**,
  semáforos, pesquisa (⌘K) e menu do botão direito.
- **Dentro dele** há um `Simulador` que corre o próprio site num iPhone — e
  dentro desse iPhone há outro. Até dois níveis, depois o sistema diz que chega.

## Como está feito

Astro gera HTML estático. O resto é JavaScript escrito à mão: **zero
frameworks, zero bibliotecas de animação, zero tracking** — e, em produção,
**zero dependências a correr**.

```
src/
  siteConfig.ts          identidade, estrutura das aplicações e TODO o texto (pt/en)
  content/blog/{pt,en}/  os escritos, um ficheiro Markdown cada
  components/os/
    Shell.astro          a casca: menus, Dock, ecrã inicial, painéis, bloqueio
    IconSprite.astro     sprite de ícones — glifos Lucide (ISC), marcas Simple Icons (CC0)
    apps/*.astro         o conteúdo de cada aplicação — HTML normal
  scripts/os/
    gesture.js           o motor de gestos: captura, eixo, velocidade, elástico
    state.js             preferências, relógio, deteção de modo
    mac.js               janelas, encaixe, Dock, menus, pesquisa
    ios.js               páginas, gestos, Central de Controlo, notificações, bloqueio
    apps.js              o que cada aplicação faz por dentro
    index.js             arranque e ligação entre os dois mundos
  lib/agents.ts          /llms.txt, /llms-full.txt e /posts.json
  styles/os.css          um ficheiro: fundações, fundos, macOS, iOS, aplicações, toque
  layouts/OS.astro       <head> de SEO + o sistema
server/index.mjs         serve o dist/, cabeçalhos de segurança e /api/contact
public/os-early.js       corre antes de pintar: tema, modo, rede de segurança
```

### A ideia que segura tudo

O conteúdo das aplicações é **HTML normal**, gerado pelo Astro dentro de
`#pool`. O JavaScript não desenha conteúdo: apenas **move esses nós** para
dentro de uma janela do Mac ou de uma vista do telefone. Daí resultam três
coisas boas:

1. **Sem JavaScript** o site continua a ser um documento legível (`#pool` é a
   página). Se o módulo não arrancar em 5 segundos, o `<head>` devolve-o.
2. O **Google lê tudo** — cada escrito tem o seu URL, com `<article>`, JSON-LD,
   hreflang e Open Graph.
3. Mudar de modo (rodar o tablet, redimensionar a janela) **não perde estado**:
   o mesmo nó muda de moldura.

### Gestos

Tudo o que desliza passa por `gesture.js`, que trava o eixo, mede velocidade e
decide no fim entre completar ou voltar atrás — é isso que separa "um site" de
um telemóvel:

| Gesto                                   | O que faz                        |
| --------------------------------------- | -------------------------------- |
| Arrastar para cima na barra inferior     | volta ao ecrã inicial            |
| Arrastar para cima e segurar             | abre o comutador de aplicações   |
| Arrastar na horizontal no ecrã inicial   | muda de página (com elástico)    |
| Puxar do canto superior direito          | Central de Controlo              |
| Puxar do canto superior esquerdo         | Centro de Notificações           |
| Arrastar da margem esquerda              | volta atrás dentro de Escritos   |
| Deslizar para cima no ecrã bloqueado     | desbloqueia                      |
| Arrastar um cartão para cima             | fecha essa aplicação             |

No Mac: arrastar uma janela para o topo ou para os lados **encaixa-a**.

### Para máquinas

`/llms.txt` e `/en/llms.txt` (índice), `/llms-full.txt` (o site inteiro em
Markdown), `/posts.json` (índice estruturado), RSS, sitemap e um `robots.txt`
que diz explicitamente que sim aos rastreadores de IA.

### Segurança

Ver [DEPLOY.md](DEPLOY.md). Em resumo: nenhuma chave no browser, limites por IP
e globais no servidor, token assinado com prazo, armadilha para robôs, e uma
política de segurança de conteúdo sem `unsafe-inline` para scripts.

## Comandos

Nada é construído na máquina de produção — o build acontece no Coolify, pelo
`Dockerfile`.

| Comando         | O que faz                                  |
| --------------- | ------------------------------------------ |
| `npm run dev`   | servidor de desenvolvimento (`:4321`)      |
| `npm run build` | gera `dist/`                               |
| `npm start`     | corre o servidor de produção sobre `dist/` |

## Escrever um texto novo

Criar `src/content/blog/pt/<slug>.md` (e o par em `en/` com o mesmo campo `key`):

```yaml
---
title: 'Título'
description: 'Uma linha para o Google e para a lista.'
date: 2026-09-06
tags: ['tema']
key: 'chave-partilhada-entre-linguas'
---
```

Aparece sozinho na aplicação Escritos, no RSS, no sitemap, nos widgets, nas
notificações, na pesquisa ⌘K, no `/llms.txt` e no `/posts.json`.
