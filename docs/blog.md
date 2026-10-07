# Escrever no blog

Um texto é um ficheiro `content/pt/<slug>.md` (e, se houver tradução, `content/en/<slug>.md`). O slug é o endereço.

```markdown
---
titulo: "O título"
resumo: "Uma ou duas frases: é a descrição no Google e nas partilhas (70–160 caracteres)."
data: 2026-10-07
atualizado: 2026-10-20          # opcional: só quando mexes a sério no texto
etiquetas: [Leituras, Inteligência artificial]
par: slug-na-outra-lingua       # liga as duas versões (hreflang)
capa:                           # opcional
  imagem: pasta/nome            # ver "Imagens"
  alt: "Descrição para quem não vê a imagem"
  legenda: "opcional"
  credito: "Foto: …"            # opcional
fonte:                          # opcional: torna o texto um "Achado" e mostra o cartão da fonte
  nome: "Título do que encontrei"
  url: https://…
rascunho: true                  # opcional: não existe para ninguém
notificar: false                # opcional: não avisa os subscritores
---
```

- **Achado**: qualquer texto com `fonte`. Mostra a etiqueta "Achado" e um cartão "Encontrei isto em…", e declara a fonte no JSON-LD (`citation`).
- **Etiquetas**: cada uma tem a sua página (`/blog/etiqueta/<tema>`). Só entra no Google (e no sitemap) a que tiver 2 ou mais textos.
- **Índice**: aparece sozinho em textos com 3 ou mais `##`. Os títulos ganham âncora.
- **Código**: blocos com linguagem (` ```ts `, `bash`, `python`, `json`, `css`, `html`, `yaml`, `sql`, `diff`, `go`, `rust`, `dockerfile`) têm realce e botão de copiar.

## Imagens

1. Põe o original em `fonte/blog/<pasta>/<nome>.jpg` (minúsculas, números e hífens; `png`, `webp`, `avif` e `svg` também servem).
2. `npm run imagens-blog` gera AVIF, WebP e JPEG/PNG em 5 tamanhos, o cartão de partilha 1200×630 e um marcador desfocado. Só refaz o que mudou. **Faz commit de `public/img/blog/` e `content/imagens.json`.**
3. No texto: `![Descrição para quem não vê](pasta/nome.jpg "Legenda opcional")`.
   Com `|larga` no fim da descrição, a imagem sai mais larga que o texto: `![Um painel|larga](pasta/nome.jpg)`.

A descrição (`alt`) é obrigatória em SEO e acessibilidade. Se a imagem não existir, o build falha em vez de publicar uma imagem partida.
A capa passa a ser a imagem de partilha (Open Graph / X). Sem capa, usa-se a imagem do site.

## Antes de publicar

`npm run dev` e `npm run verificar` (verifica sitemap, hreflang, canonical, JSON-LD, imagens e og:image de todas as páginas).
