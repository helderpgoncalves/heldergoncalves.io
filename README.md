# heldergoncalves.io

Site pessoal de Hélder Gonçalves. Não é uma página: é um **sistema operativo**.

- **No telemóvel** comporta-se como um iPhone — ecrã bloqueado, ecrã inicial com
  widgets, ícones que abrem a aplicação a partir do próprio ícone, barra de gestos,
  Central de Controlo e comutador de aplicações.
- **No computador** comporta-se como um Mac — barra de menus, Dock com ampliação,
  janelas que se arrastam e redimensionam, semáforos, pesquisa (⌘K), menu do botão
  direito e arranque com a maçã.
- **Dentro dele** há um `Simulador` que corre o próprio site num iPhone — e dentro
  desse iPhone há outro. Até dois níveis, depois o sistema diz que chega.

## Como está feito

Astro gera HTML estático. O resto é JavaScript escrito à mão: **zero frameworks,
zero bibliotecas de animação, zero tracking.**

```
src/
  siteConfig.ts          identidade, estrutura das aplicações e TODO o texto (pt/en)
  content/blog/{pt,en}/  os escritos, um ficheiro Markdown cada
  components/os/
    Shell.astro          a casca: barra de menus, Dock, ecrã inicial, bloqueio…
    IconSprite.astro     todos os ícones num sprite SVG (squircle da Apple)
    apps/*.astro         o conteúdo de cada aplicação — HTML normal
  scripts/os/
    state.js             preferências, relógio, deteção de modo
    mac.js               janelas, Dock, menus, pesquisa
    ios.js               ecrã inicial, gestos, Central de Controlo, bloqueio
    apps.js              o que cada aplicação faz por dentro
    index.js             arranque e ligação entre os dois mundos
  styles/os.css          um ficheiro: fundações, fundos, macOS, iOS, aplicações
  layouts/OS.astro       <head> de SEO + o sistema
```

### A ideia que segura tudo

O conteúdo das aplicações é **HTML normal**, gerado pelo Astro dentro de `#pool`.
O JavaScript não desenha conteúdo: apenas **move esses nós** para dentro de uma
janela do Mac ou de uma vista do telefone. Daí resultam três coisas boas:

1. **Sem JavaScript** o site continua a ser um documento legível (`#pool` é a página).
2. O **Google lê tudo** — cada escrito tem o seu URL, com `<article>`, JSON-LD e hreflang.
3. Mudar de modo (rodar o tablet, redimensionar a janela) **não perde estado**: o mesmo
   nó muda de moldura.

Se o módulo não arrancar em 5 segundos, o `<head>` devolve o documento simples.

## Comandos

Nada é construído nesta máquina — o build acontece no Coolify, pelo `Dockerfile`.

| Comando         | O que faz                             |
| --------------- | ------------------------------------- |
| `npm run dev`   | servidor local em `localhost:4321`    |
| `npm run build` | gera `dist/`                          |

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

Aparece sozinho na aplicação Escritos, no RSS, no sitemap, no widget do ecrã inicial
e na pesquisa ⌘K.
