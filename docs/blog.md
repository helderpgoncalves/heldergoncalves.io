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
serie: "Nome da série"          # opcional: liga várias partes (precisa de `parte`)
parte: 1                        # 1, 2, 3… dentro da série; não se repete
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

- **Séries e rascunhos**: com `serie` e `parte` no cabeçalho, as partes publicadas ligam-se sozinhas (lista da série, «continua na parte seguinte», `isPartOf` no JSON-LD). Um texto com `rascunho: true` não existe: não tem página, nem sitemap, nem RSS, nem `llms.txt`, nem entra na série nem nos «relacionados». Para ler os rascunhos localmente: `npm run rascunhos` (só em desenvolvimento, aparecem com a etiqueta «rascunho» e nunca indexáveis; em produção continuam inexistentes). Atenção: um texto publicado que ligue a uma parte ainda em rascunho faz o build falhar, por isso publica as partes por ordem de trás para a frente, ou tira a ligação. Se um texto publicado ligar (`[…](/blog/slug)`) a um que não existe ou é rascunho, o build falha em vez de publicar um 404.
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

## Comentários

Cada texto tem uma secção «Conversa» (carrega só quando o leitor chega perto). **Só comenta quem subscreve a newsletter**: o leitor pede uma ligação para o e-mail subscrito (`/api/comentarios/entrar`; a resposta é sempre igual, para ninguém descobrir quem está na lista), abre-a, e fica com uma sessão de 60 dias neste navegador (cookie assinado, sem guardar o e-mail: só um identificador anónimo). Limites: 1 comentário por 20 s, 6 por 10 min, no máximo 2 ligações por comentário. Um nível de respostas. Cada pessoa apaga os seus; tu apagas qualquer um com `COMENTARIOS_ADMIN_TOKEN`:

```bash
curl -X DELETE -H "Origin: https://heldergoncalves.io" -H "Authorization: Bearer $TOKEN" "https://heldergoncalves.io/api/comentarios?id=<id>"
```

Os comentários vivem em `DATA_DIR/comentarios-blog.jsonl` (só de acrescentar), no volume `/data`. Precisam das mesmas variáveis da newsletter (Resend) para funcionar.
