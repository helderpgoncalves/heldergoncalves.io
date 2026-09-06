# Deploy

O site é estático. O `Dockerfile` faz o build com Node e serve o `dist/` na
porta 3000 — pensado para Coolify (build pack: Dockerfile), mas corre em
qualquer sítio que aceite um container.

## Coolify

1. Novo recurso → **Public Repository** → `https://github.com/helderpgoncalves/heldergoncalves.io`.
2. Build pack: **Dockerfile** (deteta o `EXPOSE 3000`).
3. Domínio: `https://heldergoncalves.io`.
4. Deploy. Cada push para `main` refaz o site.

## Publicar uma nota

Não há CMS nem serviço externo: uma nota é um ficheiro Markdown no repositório.

```bash
# ver README.md para o frontmatter completo
git add src/content/blog/pt/nova-nota.md
git commit -m "Nota: ..."
git push
```

O push dispara o deploy e o texto fica no site, no RSS e no sitemap.

## Notas de operação

- **GitHub em baixo no build?** A lista de projetos volta aos valores guardados
  em `src/data/projects.ts`. O build nunca quebra por causa disso.
- **Domínio**: definido em `astro.config.mjs` (`site`). É de lá que saem o
  canonical, o sitemap e os URLs absolutos do Open Graph.
- **Imagem social**: `public/og.png`. Trocar por uma versão desenhada quando
  houver — o caminho está em `src/siteConfig.ts`.
- **Sem cookies, sem analytics.** Se um dia for preciso medir, usar algo sem
  cookies e dizê-lo na página.
