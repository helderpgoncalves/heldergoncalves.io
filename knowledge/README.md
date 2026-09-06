# Base de conhecimento do agente

Isto é o que a aplicação **Mensagens** sabe. Cada ficheiro `.md` desta pasta
entra na cabeça do agente quando o servidor arranca.

## Como se mexe nisto

1. Editar ou criar um ficheiro `.md` aqui.
2. Commit e push. O deploy recarrega.

Não é preciso tocar em código nenhum.

## Regras

- **Um assunto por ficheiro.** O prefixo numérico só serve para ordenar.
- **A primeira linha é um `# Título`.** É por ele que o agente encontra a
  secção quando pesquisa.
- **Escreve factos, não marketing.** O agente repete o que aqui estiver. Se
  escreveres "sou o melhor de Portugal", ele diz isso a quem perguntar.
- **O que não estiver aqui, o agente não sabe** — e foi mandado dizer que não
  sabe, em vez de inventar. É de propósito.
- **Nada de segredos.** Tudo o que está aqui pode acabar numa resposta a um
  desconhecido. Preços, clientes e números privados não entram.

## Limites

O conjunto dos ficheiros não deve passar dos ~48 KB (o servidor corta aí).
Isso dá para muito: são cerca de 30 páginas. Quando crescer para lá disso,
o caminho é dividir em mais ficheiros — o agente pesquisa por secção, não lê
tudo de uma vez.

## Ficheiros

| Ficheiro                 | Para quê                                   |
| ------------------------ | ------------------------------------------ |
| `00-quem-sou.md`         | identidade, percurso, onde estou           |
| `10-trabalho.md`         | o que faço, como trabalho, disponibilidade |
| `20-projetos.md`         | os projetos, um a um                       |
| `30-o-site.md`           | como este site foi feito                   |
| `40-reunioes.md`         | como se marca uma conversa                 |
| `50-perguntas-frequentes.md` | respostas a coisas que perguntam muito |
