---
name: novo-post
description: Escreve um texto novo para o blog heldergoncalves.io na voz pessoal do Hélder (opiniões, achados, ideias, software, economia), em português de Portugal impecável, sem travessões nem tiques de texto de máquina, com cabeçalho, imagens e SEO certos. Serve para dois modos: pessoal (a experiência e a opinião dele) e partilhar conhecimento ou novidades sobre o mundo, com pesquisa e fontes verificadas de ponta a ponta. Usa quando o Hélder diz "novo post", "escreve um texto sobre", "quero partilhar isto no blog", "achado", "novidade", "explica isto no blog", "passa isto a blog", ou dá um tema, uma ligação ou umas notas para publicar.
argument-hint: "[tema, ligação ou notas soltas]"
allowed-tools: Read, Write, Edit, Glob, Grep, Bash, WebFetch, WebSearch, Agent, AskUserQuestion
---

# Novo texto para o blog

O objetivo é um texto que pareça escrito pelo Hélder, numa tarde, para quem o segue: pessoal, caseiro, com opinião, verdadeiro. Não um artigo de revista, não conteúdo.

Antes de escrever, lê `references/voz.md` (a voz e as regras de português) e `references/formato.md` (cabeçalho, imagens, verificação). São a lei deste blog. Se o texto é para partilhar conhecimento ou novidades sobre o mundo, lê também `references/saber.md`.

## Dois modos

- **Pessoal**: parte da experiência e da opinião do Hélder. Os passos abaixo, tal como estão.
- **Saber** (conhecimento, novidades, explicadores, economia, software, ciência): parte de um tema do mundo. O Hélder pode não ter nada de pessoal a acrescentar além do ponto de vista, e está certo. A diferença: há uma fase de pesquisa antes de escrever, o texto vive de factos verificados e de uma secção `## Fontes`, e a voz dele aparece na leitura que faz, não em episódios inventados. Escolhe este modo quando o pedido é «explica», «novidade sobre», «o que se passa com», «partilha isto» sem experiência própria. Em dúvida, pergunta numa só pergunta.

## Regras que nunca se quebram

1. **Não se inventa a vida do Hélder, nem factos do mundo.** Experiências, números, ferramentas usadas, conversas, emoções: só o que ele disse. Falta um episódio? Pergunta. Sem resposta, deixa `[PREENCHER: …]` e avisa. Factos do mundo verificam-se na fonte.
2. **Sem travessões** (— –), sem ` - ` a fazer de travessão, sem emojis, sem tiques de texto de máquina.
3. **Português de Portugal**, Acordo de 1990, tu, «estar a» + infinitivo, aspas «assim».
4. **Nada vai para produção sem o Hélder ver.** Cria os ficheiros e mostra. Commit só se ele pedir; push só se ele pedir; avisar a newsletter só se ele disser que sim.
5. Em textos que já existem, não se apaga nem se reescreve nada que o Hélder não tenha pedido.

## Passos

1. **Perceber o pedido.** Do argumento e da conversa, tira: tema, tipo (achado, opinião, nota de ofício, ideia em rascunho, economia/mundo), fonte (ligação), o que o Hélder pensa, o que lhe aconteceu, imagens que tem. Se for um achado com ligação, lê a fonte com WebFetch e anota os factos exatos.
2. **Fazer as perguntas que faltam, poucas.** Com AskUserQuestion, no máximo 3 perguntas, só sobre o que dá pessoa ao texto e que não podes saber: a posição dele, um episódio real, o que discorda. Se o pedido já traz material de sobra, avança sem perguntar. Pergunta também se o texto leva versão em inglês e se avisa a newsletter (por omissão: não traduz, não avisa).
3. **Pesquisar (só no modo saber).** Lança o agente `pesquisador-blog` com o tema, o ângulo e as fontes que o Hélder já tem. Devolve um dossiê: factos com fonte, data e unidade, o que está em disputa, o que falta, e as ligações para a secção Fontes. Se o dossiê vier fraco ou contraditório, diz ao Hélder antes de escrever, em vez de arredondar.
4. **Escrever.** Lança o agente `redator-blog` com um briefing completo (tema, tipo, modo, dossiê de pesquisa, factos da fonte, as palavras e opiniões do Hélder, imagens, etiquetas já existentes, slug sugerido). Ele cria `content/pt/<slug>.md` com `rascunho: true` e `notificar: false`.
5. **Rever.** Lança o agente `revisor-blog` sobre o ficheiro. Ele corrige o português, a voz e o cabeçalho, corre `npm run texto -- <slug>` e devolve os avisos que sobraram.
6. **Traduzir, se pedido.** Lança `tradutor-blog`. Liga os dois ficheiros com o mesmo `par`.
7. **Imagens.** Se houver, coloca os originais em `fonte/blog/<pasta>/`, corre `npm run imagens-blog`, e confirma que cada imagem tem descrição.
8. **Verificar.** Tira `rascunho: true` só quando o texto estiver pronto e o Hélder o tiver visto. Corre `npm run texto -- <slug>` (com `--saber` no modo saber), `npm run build`. Se possível, `npm run dev` e um olhar rápido à página.
9. **Entregar.** Diz em poucas linhas: o ficheiro, o título e o resumo, o que ficou por preencher, os avisos que sobraram, e pergunta se quer ajustar, fazer commit ou publicar. Mostra o texto inteiro apenas se ele pedir.

## Quando o pedido é vago

Se o Hélder só diz «escreve sobre X» sem nada seu, não escreves um ensaio genérico. Pergunta o que ele pensa de X e o que o fez lá chegar. Um texto sem ponto de vista não se publica.

## Alterar um texto existente

Lê-o inteiro, mantém a voz e o cabeçalho, edita só o pedido, acrescenta `atualizado` com a data de hoje se a mudança for de substância, e corre `npm run texto`.
