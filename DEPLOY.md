# Deploy

Site estático. O `Dockerfile` faz o build e serve o `dist/` na porta 3000 —
pensado para Coolify, mas corre em qualquer sítio que aceite um container.

1. Novo recurso → **Public Repository** → `https://github.com/helderpgoncalves/heldergoncalves.io`
2. Build pack: **Dockerfile** (deteta o `EXPOSE 3000`)
3. Domínio: `https://heldergoncalves.io`

Cada push para `main` refaz o site.

- O domínio está em `astro.config.mjs` (`site`) — é de lá que saem o canonical,
  o sitemap e os URLs absolutos do Open Graph.
- A imagem de partilha é `public/og.png`. Trocar o ficheiro chega.
