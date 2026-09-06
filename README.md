# heldergoncalves.io

Site pessoal do Hélder Gonçalves. Astro estático, sem framework de interface,
sem trackers e com quase nada de JavaScript.

## Como está feito

- **Astro 4**, saída 100% estática (`dist/`), pronta para qualquer servidor de ficheiros.
- **Duas línguas com URLs próprios**: português na raiz (`/`), inglês em `/en/`.
  Não é um toggle no browser — são páginas diferentes, com `hreflang`, canonical
  e Open Graph por idioma. É o que o Google consegue indexar.
- **Blog em Markdown** (`src/content/blog/pt|en`), com content collections, RSS
  por idioma e SEO por artigo (`BlogPosting` + `BreadcrumbList`).
- **Projetos vindos do GitHub** no momento do build; se a API falhar, usa os
  valores guardados em `src/data/projects.ts` e o build passa na mesma.
- **Tema claro/escuro** com respeito pelo sistema, sem flash na primeira pintura.
- **Paleta de comandos** (`⌘K` / `Ctrl+K`, ou `/`): pesquisa navegação, projetos,
  notas e ações. Em ecrãs pequenos é também o menu.

## Correr localmente

```bash
npm install
npm run dev        # http://localhost:4321
npm run build      # gera dist/
npm run preview    # pré-visualiza o build
```

## Onde mexer

| O quê | Ficheiro |
| --- | --- |
| Texto do site (PT e EN) | `src/i18n/ui.ts` |
| Identidade, email, redes | `src/siteConfig.ts` |
| Projetos em destaque | `src/data/projects.ts` |
| Notas do blog | `src/content/blog/pt/*.md` e `src/content/blog/en/*.md` |
| Estilos | `src/styles/app.css` |

### Escrever uma nota

Cria o ficheiro na pasta do idioma:

```markdown
---
title: 'Título da nota'
description: 'Uma frase que também serve de meta description.'
date: 2026-09-10
tags: ['IA', 'Engenharia']
translationKey: 'chave-unica'    # a mesma nas versões PT e EN
draft: false
---

Texto em Markdown.
```

O `translationKey` é o que liga a versão portuguesa à inglesa — é dele que sai o
`hreflang` de cada artigo. Uma nota sem par no outro idioma continua a funcionar:
o `hreflang` aponta para o arquivo.

## SEO

- Canonical absoluto e `hreflang` (`pt-PT`, `en`, `x-default`) em todas as páginas.
- Open Graph e Twitter Card com imagem PNG (`/og.png` — as redes sociais não
  renderizam SVG).
- JSON-LD: `Person` e `WebSite` em todas as páginas, `Blog` no arquivo,
  `BlogPosting` + `BreadcrumbList` nos artigos.
- `sitemap-index.xml` com alternâncias de idioma, `robots.txt` a apontar para ele
  e feeds RSS em `/rss.xml` e `/en/rss.xml`.

## Acessibilidade

Marcação semântica, um `<h1>` por página, link "saltar para o conteúdo", foco
sempre visível, contraste AA, alvos de toque de 40px no telemóvel, paleta
navegável só com teclado (setas, `Enter`, `Esc`, foco preso e devolvido) e
respeito por `prefers-reduced-motion`.
