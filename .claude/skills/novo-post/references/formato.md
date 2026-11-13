# Formato técnico de um texto

Ficheiros em `content/pt/<slug>.md` e, havendo tradução, `content/en/<slug-em-ingles>.md`. O slug é o endereço: curto, em minúsculas, sem acentos, com hífens, em PT no ficheiro PT e em EN no ficheiro EN.

```markdown
---
titulo: "Frase normal, só a primeira palavra em maiúscula"
resumo: "Uma ou duas frases, 70 a 160 caracteres. É o que aparece no Google e nas partilhas."
data: 2026-10-07
atualizado: 2026-10-20        # só se mexeres a sério depois de publicar
etiquetas: [Tema, Outro tema] # 1 a 4, reaproveitando as que já existem em content/
par: slug-do-outro-idioma     # só se houver tradução; tem de ser igual nos dois lados
serie: "Nome da série"          # opcional: liga várias partes (precisa de `parte`)
parte: 1                        # 1, 2, 3… dentro da série; não se repete
capa:                         # opcional
  imagem: pasta/nome
  alt: "Descrição para quem não vê a imagem"
  legenda: "opcional"
  credito: "Foto: …"
fonte:                        # só nos achados
  nome: "Título do que encontrei, e quem o escreveu"
  url: https://…
notificar: false              # false = não avisa os subscritores por e-mail (o padrão é avisar)
rascunho: true                # enquanto não estiver pronto: ninguém vê
---
```

- `notificar` fica a `false` em textos de teste. Em textos a sério, perguntar ao Hélder se quer avisar a newsletter.
- Etiquetas existentes: ver `grep -h "^etiquetas" content/*/*.md`. Só se cria uma nova se nenhuma servir. Em PT e EN as etiquetas são traduzidas (Leituras / Reading).
- Título com menos de 70 caracteres, sem dois pontos de manchete («Tudo sobre…»), sem clickbait. Deve prometer o que o texto cumpre.
- Sem `# Título` no corpo: o título vem do cabeçalho. Secções com `##`, subsecções com `###`.
- Imagens: ver `docs/blog.md`. Original em `fonte/blog/<pasta>/<nome>.jpg`, depois `npm run imagens-blog`, depois `![descrição que diz o que se vê](pasta/nome.jpg "legenda")`. A descrição é obrigatória. Com `|larga` no fim da descrição, a imagem sai mais larga. Uma imagem tem de acrescentar algo (um ecrã, um gráfico, um objeto); não se põem imagens de banco só para enfeitar. Nunca se usam imagens de terceiros sem permissão e crédito.
- Código: bloco com linguagem (`ts`, `bash`, `python`, `json`, `css`, `html`, `yaml`, `sql`, `diff`, `go`, `rust`, `dockerfile`).
- Ligações: texto que diz para onde vão. Externas só https. Nada de HTML cru (aparece como texto).
- Citações da fonte: curtas, entre «», com ligação. Nunca copiar parágrafos.

## Verificação

1. `npm run texto -- <slug>` (e `-- <slug> --lang en`): português, tiques, cabeçalho. Zero erros; os avisos leem-se um a um e corrigem-se ou justificam-se.
2. `npm run build`: falha se uma imagem não existir ou o cabeçalho estiver mal.
3. `npm run dev` e abrir o texto no telemóvel e no ecrã grande.
4. `npm run verificar` (com o dev a correr): SEO de todas as páginas.
