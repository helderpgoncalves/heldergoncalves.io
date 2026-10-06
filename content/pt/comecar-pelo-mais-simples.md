---
titulo: "Começar pelo mais simples que funcione"
resumo: "Uma nota de leitura sobre «Building effective agents», da Anthropic: workflows e agentes não são a mesma coisa, e quase sempre o primeiro chega."
data: 2026-09-22
etiquetas: [Inteligência artificial, Leituras, Engenharia]
par: start-with-the-simplest-thing
notificar: false
fonte:
  nome: "Building effective agents — Anthropic, 2024"
  url: https://www.anthropic.com/engineering/building-effective-agents
---

Entre os textos práticos sobre sistemas com modelos de linguagem, «Building effective agents», publicado pela Anthropic em dezembro de 2024, é dos que mais vale a pena ler devagar. Não vende uma promessa. Põe ordem nas palavras.

## Duas coisas diferentes com o mesmo nome

A distinção central é esta. Num **workflow**, o caminho está escrito em código: o modelo é chamado em passos previstos, e quem decide o que vem a seguir é o programa. Num **agente**, o modelo decide o caminho, escolhe as ferramentas e continua até achar que acabou.

Parecem variações do mesmo tema, mas comportam-se de maneiras muito diferentes: o workflow é previsível e barato de testar; o agente é flexível, mas custa mais, demora mais e erra de formas mais difíceis de antecipar.

## Os padrões, em curto

O texto descreve alguns padrões de workflow que cobrem muito terreno: **encadear** prompts, com uma verificação pelo meio; **encaminhar** cada pedido para o tratamento certo; **paralelizar** partes independentes; um **orquestrador** que reparte trabalho por outros; e um ciclo em que um modelo **avalia** e melhora o resultado de outro.

## O conselho que fica

A recomendação com que mais concordo é a menos espetacular: **procurar a solução mais simples possível, e só acrescentar complexidade quando for preciso**. Muitas vezes uma só chamada bem pensada, com bom contexto, já resolve. Um agente justifica-se quando o problema é aberto, quando não se consegue prever os passos de antemão, e quando se pode confiar, dentro de limites, no julgamento do modelo.

É o mesmo instinto de qualquer bom ofício: a ferramenta mais sofisticada não é a melhor, é a que o problema pede. E convém medir, para saber se a complexidade a mais está de facto a render.
