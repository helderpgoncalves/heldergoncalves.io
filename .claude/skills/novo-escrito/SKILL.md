---
name: novo-escrito
description: Cria um escrito novo para o blog, com o frontmatter certo e o slug certo. Usa quando alguém quiser publicar um texto, um artigo ou uma nota no blog do site.
disable-model-invocation: true
argument-hint: [título do escrito]
---

# Escrito novo

O tema é: **$ARGUMENTS**

Se vier vazio, pergunta sobre o que é antes de criar seja o que for.

## Onde

`src/content/blog/pt/<slug>.md` — e, se houver versão inglesa,
`src/content/blog/en/<slug>.md` com o **mesmo nome de ficheiro**.

O slug vem do título: minúsculas, sem acentos, palavras separadas por
hífen, sem artigos soltos no início. `porque-voltei-a-escrever`, não
`2026-01-porque-eu-voltei-a-escrever`. A data está no frontmatter; não
se repete no nome.

## O frontmatter

```yaml
---
title: 'O título, como se diria em voz alta'
description: 'Uma frase. É o que aparece na lista, no RSS e no Google.'
date: 2026-09-07
tags: ['um', 'dois']
draft: true
key: 'chave-partilhada'
---
```

- `title` e `description` são obrigatórios. `description` é uma frase
  inteira, não um resumo telegráfico — é o que o leitor vê antes de
  decidir se entra.
- `date` no formato `AAAA-MM-DD`. Usa a data de hoje a sério.
- `updated` só quando o texto mudar depois de publicado.
- `tags` em minúsculas, poucas, e reaproveitando as que já existem.
- **`draft: true` enquanto não estiver pronto.** Rascunhos não saem no
  site nem no feed. Tira-se quando for para publicar.
- `key` só se houver as duas línguas: a mesma chave nos dois ficheiros é
  o que os liga, e é o que faz aparecer o «Read this in English».

## O texto

- Sem `#` no corpo. O `title` do frontmatter é o `<h1>` da página; um
  segundo estraga a estrutura e o SEO.
- Começa em `##`.
- Português de Portugal — ver `.claude/rules/texto.md`.
- Blocos de código com a linguagem declarada.
- Imagens em `public/`, referidas por caminho absoluto.

## Depois

O escrito aparece sozinho na app Blog, na lista, no `/rss.xml`, no
`/posts.json` e nos `llms.txt`. **Não há nada a registar em lado
nenhum** — se te apeteceu editar um índice, o slug ou a pasta estão
errados.

Corre `/verificar` no fim.
