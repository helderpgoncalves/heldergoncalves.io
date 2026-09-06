# heldergoncalves.io

Site pessoal e blog, em português e inglês.

- **Astro**, saída estática, **sem JavaScript no cliente**.
- Português na raiz (`/`, `/blog/`), inglês em `/en/` e `/en/blog/` — páginas
  reais, com `hreflang`, canonical, Open Graph, RSS e JSON-LD (`Person`,
  `Blog`, `BlogPosting`).
- Tema claro e escuro conforme o sistema. Sem cookies, sem analytics, sem
  tipos de letra externos. O fundo (aurora + grão) é CSS e SVG — zero imagens.

## Correr

```bash
npm install
npm run dev        # http://localhost:4321
npm run build      # gera dist/
```

## Escrever um texto

Um ficheiro Markdown por texto, dentro da pasta da língua. O nome do ficheiro
é o endereço: `src/content/blog/pt/o-meu-texto.md` → `/blog/o-meu-texto/`.

```markdown
---
title: 'Título do texto'
description: 'Uma linha que aparece na lista, no Google e no RSS.'
date: 2026-09-06
tags: ['mcp', 'agentes']
draft: false        # true = não é publicado
key: 'chave-comum'  # mesma chave no PT e no EN liga as duas versões
---

O corpo, em Markdown.
```

A versão inglesa do mesmo texto vai para `src/content/blog/en/` com a mesma
`key` — o site passa a mostrar "Read this in English" / "Ler em português" e
os `hreflang` certos. Não é preciso mexer em mais nada: listas, RSS e sitemap
são gerados a partir dos ficheiros.

## Onde está o quê

| O quê | Onde |
| --- | --- |
| Textos das páginas (PT e EN), email, links, rotas | `src/siteConfig.ts` |
| Estilos, cores, fundo | `src/styles/app.css` |
| `<head>`, cabeçalho e rodapé | `src/layouts/Base.astro` |
| Página inicial | `src/components/Home.astro` |
| Lista de textos / um texto | `src/components/PostList.astro`, `Article.astro` |
| Esquema do frontmatter | `src/content/config.ts` |
| Dados estruturados (schema.org) | `src/lib/seo.ts` |
| Feeds RSS (`/rss.xml`, `/en/rss.xml`) | `src/lib/rss.ts` |

O sitemap é gerado pelo `@astrojs/sitemap` durante o build.
