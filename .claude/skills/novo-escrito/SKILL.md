---
name: novo-escrito
description: Cria um escrito novo para o blog, com o frontmatter certo, o slug certo e as imagens no sítio certo — e explica o que acontece aos subscritores quando é publicado. Usa quando alguém quiser publicar um texto, um artigo ou uma nota no blog do site.
disable-model-invocation: true
argument-hint: [título do escrito]
---

# Escrito novo

O tema é: **$ARGUMENTS**

Se vier vazio, pergunta sobre o que é antes de criar seja o que for.

## Há dois caminhos, e fazem a mesma coisa

| | |
| --- | --- |
| **Pelo repositório** (é este) | Escreves o `.md` à mão, commit, push. O deploy refaz o site. |
| **Pela app Blog** | O dono abre o Blog com sessão, escreve, carrega em «Publicar». A API faz o commit por ele (`api/app/routers/escritos.py`) e avisa os subscritores. |

A diferença que interessa: **só o botão «Publicar» avisa a lista**.
Um commit feito à mão põe o escrito no site e mais nada — ver «Os
subscritores», abaixo.

## Onde

`src/content/blog/pt/<slug>.md` — e, se houver versão inglesa,
`src/content/blog/en/<slug>.md` com o **mesmo nome de ficheiro**.

O slug vem do título: minúsculas, sem acentos, palavras separadas por
hífen, sem artigos soltos no início. `porque-voltei-a-escrever`, não
`2026-01-porque-eu-voltei-a-escrever`. A data está no frontmatter; não
se repete no nome.

O endereço final sai daqui: `/blog/<slug>/` em português,
`/en/blog/<slug>/` em inglês. É o mesmo cálculo que o servidor faz para
pôr a ligação no email dos subscritores (`api/app/newsletter.py`,
`post_url`) — se mudares as rotas num sítio, muda no outro.

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
  decidir se entra, e é também o que vai no corpo do email aos
  subscritores.
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

## As imagens

Vivem em `public/img/blog/<slug>/`, e referem-se pelo caminho servido,
sem o `public/`:

```markdown
![Uma legenda que diz o que se vê](/img/blog/porque-voltei-a-escrever/mesa.png)
```

- **O texto alternativo não é opcional.** Descreve o que a imagem
  mostra; se for puramente decorativa, deixa-o vazio (`![]`), que é o
  que diz a um leitor de ecrã para a saltar.
- PNG, JPEG, GIF, WebP ou AVIF. Nada de SVG: seria um ficheiro com
  script a ser servido do nosso domínio.
- Tecto de 4 MB por imagem (`LIMITS.escrito_image`). Uma fotografia de
  blog acima disso está por optimizar, não grande.
- `public/` é copiado tal e qual para a raiz do site: a imagem só
  existe depois do build que vem a seguir ao commit — tal como o
  escrito.
- Pela app Blog é a mesma pasta e a mesma regra: o botão «Imagem» (ou
  largar o ficheiro em cima do corpo) sobe-a num commit e escreve o
  Markdown onde o cursor estava.

## Os subscritores

Quem confirmou a subscrição recebe **um email por escrito publicado**,
na língua que escolheu, com o título, a descrição e a ligação — e a de
sair da lista. Quem pediu os ingleses não é incomodado por um escrito
em português.

- Quem manda é `api/app/newsletter.py`, a seguir ao commit e **só se o
  commit tiver corrido**: nunca se anuncia um escrito que não ficou.
- Sai em segundo plano, às quatro de cada vez. O «Publicar» não espera
  pelos envios; o editor mostra a quantas pessoas vai.
- **Publicar duas vezes avisa duas vezes.** Se corrigires uma vírgula
  num escrito já publicado, guarda o rascunho e não voltes a carregar
  em «Publicar» — faz o commit à mão, ou aceita que a lista recebe
  outro email.
- Um `.md` posto no repositório à mão nunca avisa ninguém. Para um
  escrito que tenha de chegar à lista, publica-o pela app.

## Depois

O escrito aparece sozinho na app Blog, na lista, no `/rss.xml`, no
`/posts.json` e nos `llms.txt`. **Não há nada a registar em lado
nenhum** — se te apeteceu editar um índice, o slug ou a pasta estão
errados.

Corre `/verificar` no fim.
