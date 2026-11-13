---
titulo: "Como ganhámos o Hack4Guimarães com o Novelo"
resumo: "Uma equipa de dois, agentes de IA e cinco dias: como organizámos o desenvolvimento para ganhar o Hack4Guimarães 2035."
data: 2026-11-13
etiquetas: [Novelo, Hackathons, Inteligência artificial, Software]
par: how-we-won-hack4guimaraes-with-novelo
capa:
  imagem: novelo/hero.png
  alt: "Página de entrada do Novelo, com 301,3 toneladas de têxteis recolhidas à parte e cerca de 3 003 toneladas ainda no lixo."
notificar: false
rascunho: false
---

Às 14:59 de 19 de outubro fizemos o primeiro commit. Às 21:07 desse dia o Novelo já tinha otimizador, cenários, lotes, passaporte e triagem. Não foi pressa: foi uma decisão tomada antes de escrever código, a de organizar o trabalho como se organiza um sistema.

O Novelo explica-se depressa. O modo como o construímos, a mim, interessa-me mais, e é disso que trata o resto do texto.

## O que é o Novelo

É uma ferramenta de decisão que desenha a recolha seletiva de têxteis em Guimarães ao menor custo. Entram um orçamento e uma meta. Saem cenários comparáveis em euros, toneladas, toneladas reutilizáveis e euros por tonelada, calculados por um otimizador (OR-Tools: o CP-SAT escolhe pontos e canais, o VRP faz as rotas) sobre dados reais da Vitrus Ambiente. Está online em [novelo.helder.si](https://novelo.helder.si). Somos dois: eu e o Flávio Fernandes.

Foi a nossa resposta ao desafio 5, «TexVitrus», do Hack4Guimarães 2035. A pergunta da Vitrus era esta: «como criar um serviço de recolha seletiva de têxteis pós-consumo que garanta material reutilizável e reciclável, com o menor investimento e o menor custo de operação?»

## O problema, em números

Em 2025, Guimarães recolheu à parte 301,3 toneladas de têxteis. Ainda vão para o indiferenciado cerca de 3 003 toneladas por ano. A conta é de 51 250 t de indiferenciado vezes 5,86% de têxtil, a percentagem da APA no RARU 2025. A Vitrus recolheu 43 050,5 t desse total, 84,0%, segundo o Relatório e Contas de 2025. É uma estimativa, e assim está marcada no repositório.

A captura atual ronda 9,1%: mais de 9 em cada 10 quilos acabam no lixo. E o lixo custa: cada tonelada de indiferenciado custa 105,64 € a tratar (40 € de taxa mais 65,64 € da Resinorte, valores da Vitrus). A recolha seletiva de têxteis é obrigatória desde 1 de janeiro de 2025.

## A resposta que tivemos de refazer

A primeira versão do modelo foi desmentida. A 21 e 22 de outubro, a Vitrus disse-nos que não tem nem quer contentores de têxtil: contaminam, e a contaminação destrói a reutilização, que é onde está o valor. E que o saco não pode ir no compactador. Refizemos o modelo nesses dois dias.

Ficou uma rede à volta de uma única viatura de têxtil nova, sem compactação, a sair do Estaleiro da Rua das Lameiras, em Polvoreira. Há saco fechado à porta, num dia fixo por freguesia, e paragens em locais municipais que já existem e nas 86 escolas. Zero contentores novos.

Com 60 000 € por ano, o otimizador dá 58 pontos em 43 freguesias e saco à porta em 3. Custa 43 914 € por ano e desvia 431,1 t a 101,9 € por tonelada, das quais cerca de 256 t reutilizáveis. A captura sobe de 9,1% para cerca de 22,2%. O tratamento evitado, 45 542 € por ano, paga a operação (35 702 €) e o custo total: o custo líquido sai a −1 628 € por ano. O investimento é de 57 000 €, dos quais 42 500 € são a viatura. Em 8 de cada 10 simulações o custo fica entre 81,6 e 139,7 €/t. Tudo isto é estimativa, e o ecrã di-lo.

![O simulador do Novelo com orçamento de 60 000 € por ano: 431,1 t desviadas, 102 €/t, custo anual de 43 914 € e investimento de 57 000 €, todos marcados como estimativa.](novelo/simulador.png "O cenário de referência no simulador. Cada valor previsto traz a etiqueta «estimativa».")

Os quilómetros são medidos pela estrada, com um OSRM próprio sobre OpenStreetMap, e não em linha reta. O que pedimos à Vitrus é um piloto de três meses em duas freguesias.

O resto é a arquitetura de desenvolvimento.

## Ler o concurso como uma especificação

Os critérios públicos (FAQ oficial do evento, consultada a 19 de outubro) pesavam assim: inovação e originalidade 25%, viabilidade técnica 25%, impacto e relevância 30%, apresentação e potencial de continuidade 20%. Pitch presencial, júri de especialistas, sem voto público. IA permitida e encorajada, se identificada. E o histórico dos repositórios podia ser verificado. O enunciado resumia o que contava: «a inovação da solução, a solidez técnica do que foi construído, o impacto no território e a clareza com que a equipa o apresenta».

Tratámos isso como se trata um requisito. Fizemos uma matriz: critério, prova, onde se mostra, nota de autoavaliação. A nota ponderada de partida foi 6,05 e o alvo 7,75 (estimativas nossas, entre 19 e 25 de outubro). As lacunas ficaram listadas por ordem. No primeiro dia escrevemos um documento de estratégia mestre, preparámos 48 perguntas possíveis do júri mais 12 por critério, e deixámos planos B para o pitch, para os dados e para a mentoria.

A peça de que mais gosto é mais pequena: um registo de afirmações. Nenhum número vai para o palco sem estado de verificação, isto é, sem se saber se vem de fonte primária. Num concurso sobre impacto, é a diferença entre dizer «431 toneladas» e poder mostrar de onde vêm.

## Uma regra zero para os números

No repositório há uma regra que vem antes de todas: tudo o que seja número usa dados reais da Vitrus. Um valor ou vem dos ficheiros, ou é um pressuposto com fonte, ou leva «estimativa» no ecrã. Não há uma quarta opção.

Quando a Vitrus mudou a base de cálculo do têxtil no indiferenciado (0,7 kg por habitante por mês, de um plano municipal; depois 5,4%; depois 5,86%, a 22 de outubro), refizemos tudo. Era possível porque os documentos e o `AGENTS.md` foram atualizados no mesmo commit que o código. A regra só funciona se a fonte e a conta andarem juntas.

## Um contexto para todas as ferramentas

O `AGENTS.md` é a fonte única de instruções. Eu trabalho com o Claude Code, o Flávio com o GLM através do Z.ai/ZCode, e o repositório está preparado também para Cursor e Codex. O `CLAUDE.md` é curto e só importa o `AGENTS.md`. Assim, dois humanos com ferramentas diferentes partilharam o mesmo contexto e os mesmos procedimentos.

Por cima disso, `.claude/skills/` tem 10 procedimentos reutilizáveis, cada um com o seu nome: `add-api-feature`, `add-web-feature`, `contract-gen`, `data-etl`, `deploy-coolify`, `llm-feature`, `novelo-context`, `optimization-model`, `ship` e `write-docs`. E `.claude/agents/` tem 8 subagentes finos (`api-engineer`, `web-engineer`, `optimization-engineer`, `data-engineer`, `ai-engineer`, `devops`, `reviewer`, `docs-writer`) que não sabem muito por si: delegam nas skills. A skill `novelo-context` tem de ser lida antes de tocar em números, o que é a regra zero a aparecer outra vez, agora como procedimento.

Acho que é aqui que está o ganho real. Um agente sem contexto escreve código plausível. Um agente com procedimentos escritos escreve código que se parece com o resto.

## Contrato primeiro

O FastAPI define o contrato com modelos Pydantic. Exporta-se um `openapi.json` versionado, e o `just gen` gera o cliente TypeScript (com o hey-api). A parte web só consome o cliente gerado, e o gerado nunca se edita à mão. Os hooks do `.claude/settings.json` formatam Python e TypeScript depois de cada edição e bloqueiam edições a ficheiros gerados.

Isto parece burocracia, mas é o que permite paralelizar. Fixado o contrato, o `api-engineer` e o `web-engineer` correm ao mesmo tempo sem se pisarem, porque o que os liga é um ficheiro e não uma conversa.

## Portas de qualidade, sem CI

Durante o hackathon não tivemos CI remota. Fazíamos push direto para `main`, e o Coolify fazia deploy a cada push, numa VPS. Para isso não ser uma aposta, as verificações ficaram na nossa máquina, com `just`:

```bash
just check-fast   # para iterar: em paralelo, VRP cortado, alvo abaixo de 90 s
just check        # limites reais do solver, alvo abaixo de 5 min, antes de cada push
```

Os testes são 1 164 na API e 449 na web. Cada worker do pytest tem a sua base de dados, clonada de um modelo. A abertura da página de entrada é testada em 13 tamanhos de ecrã, com Playwright. Os commits seguem Conventional Commits. Depois do hackathon passámos a branch com pull request antes de `main`; sem pressa de prazo, deixou de haver razão para o atalho.

## A IA com rédea curta

O modelo, via OpenRouter, devolve JSON validado por Pydantic e nunca faz contas. Os números vêm do otimizador. O fluxo é este: o utilizador pergunta em português, o modelo traduz a pergunta para uma alteração estruturada (um `ScenarioDelta`), o utilizador confirma com um «Entendi: …», o otimizador calcula, o modelo escreve a explicação, e um verificador rejeita qualquer número que não exista nos resultados. Se rejeitar, o modelo reescreve uma vez. À segunda, o utilizador recebe só a tabela.

O Copiloto tem 52 ferramentas tipadas, e as ações só avançam com confirmação. A 22 de outubro avaliámo-lo com o modelo real: 180 casos em português e inglês, com 173 a 177 aprovados em duas corridas, 99% dos números verificados e 100% de resistência a injeção de prompt.

A triagem por foto segue a mesma lógica. Com a etiqueta legível, a composição saiu certa em todas as peças que testámos (5 composições, com 86% a 97% de confiança). Só com a peça, sem etiqueta, a fibra fica «desconhecida», porque o modelo não adivinha. E o operador confirma sempre.

![A página de triagem do Novelo no computador e no telemóvel: foto de um cachecol de lã com etiqueta, sugestão do modelo com 97% de confiança e campos para o operador confirmar tipo, peso, estado e composição.](novelo/triagem.png "A triagem de peças. O modelo sugere, o operador confirma. Foto do cachecol: Amin, CC BY-SA 4.0, Wikimedia Commons.")

Acho que a rédea curta é a decisão de arquitetura mais defensável de todas. Um modelo de linguagem é bom a traduzir e a explicar, e mau a ser fonte de verdade. Pô-lo nas pontas, com um verificador à saída, deixa-o útil sem lhe dar poder sobre os números.

## O ritmo, como o repositório o mostra

O repositório tem 138 commits, 120 deles nos cinco dias da maratona: 26 a 19 de outubro, 41 a 20, 28 a 21, 16 a 22 e 9 a 23. No registo aparecem 102 commits meus, 21 do «Claude», 14 do Flávio e 14 do dependabot.

A 22 de outubro fizemos uma auditoria de UX às páginas que o júri ia usar, gerámos o vídeo de apresentação e o deck a partir de dados reais, e refizemos o modelo da viatura com as respostas da Vitrus desse dia. Na manhã de 23, ficaram as rotas por estrada com o OSRM próprio, as fotos opcionais por peça (por causa do RGPD), um seed de demonstração com 6 lotes e 7 cenários, e a versão 6 do Copiloto. A submissão fechava nesse dia às 17h30.

A maratona foi de 19 a 23 de outubro e a apresentação ao júri a 26. O 1.º lugar do Hack4Guimarães 2035 (7 500 €) e a vitória no desafio TexVitrus (1 000 €) somam 8 500 €, entregues a 28 de outubro de 2026 no Mês da Economia de Guimarães. Usámos IA e dissemo-lo, como o evento pedia.

## Na imprensa

Da mais recente para a mais antiga, onde a data está confirmada; as restantes ficam sem data.

- ECO, 3 de novembro: [«Dois jovens de Barcelos querem desatar o nó da recolha de resíduos têxteis em Guimarães»](https://eco.sapo.pt/2026/11/03/dois-jovens-de-barcelos-querem-desatar-o-no-da-recolha-de-residuos-texteis-em-guimaraes/)
- Portugal Têxtil, 29 de outubro: [«Novelo quer tornar recolha de resíduos têxteis mais eficiente»](https://portugaltextil.com/novelo-quer-tornar-recolha-de-residuos-texteis-mais-eficiente/)
- E24, 29 de outubro: [«Guimarães: Plataforma «Novelo» vence Hack4Guimarães e combate lixo têxtil»](https://e24.pt/guimaraes-plataforma-novelo-vence-hack4guimaraes-e-combate-lixo-textil/)
- Mais Guimarães, 29 de outubro: [«Engenheiros de Barcelos vencem Hack4Guimarães com um plano para recolher mais têxteis gastando menos»](https://maisguimaraes.pt/dupla-de-barcelos-vence-hack4guimaraes-com-um-plano-para-recolher-mais-texteis-gastando-menos)
- O Minho, 28 de outubro: [«Engenheiros de Barcelos ganham prémio de 7.500 euros por inovação na gestão dos resíduos têxteis»](https://ominho.pt/engenheiros-de-barcelos-ganham-premio-de-7-500-euros-por-inovacao-na-gestao-dos-residuos-texteis/)
- Jornal T: [«Novelo propõe recolher 431 toneladas de têxteis por ano em Guimarães»](https://jornal-t.pt/noticia/novelo-propoe-recolher-431-toneladas-de-texteis-por-ano-em-guimaraes/)
- O Amarense: [«Dois jovens de Barcelos vencem Hack4Guimarães 2035 com plataforma para recolha de resíduos têxteis»](https://oamarense.pt/dois-jovens-de-barcelos-vencem-hack4guimaraes-2035-com-plataforma-para-recolha-de-residuos-texteis/)
- O Amarense, sobre o encerramento do Mês da Economia: [«Autarca de Guimarães defende inovação e cooperação para reforçar economia local»](https://oamarense.pt/autarca-de-guimaraes-defende-inovacao-e-cooperacao-para-reforcar-economia-local/)
- Rádio Alto Minho: [«“Novelo”: projeto de estudante e antigo aluno da UNIPVC vence dois prémios em Guimarães»](https://radioaltominho.pt/noticias/novelo-projeto-de-estudante-e-antigo-aluno-da-unipvc-vence-dois-premios-em-guimaraes/)
- Rádio Fundação: [«Projeto ‘Novelo’ vence o Hack4Guimarães 2035 e o desafio TextVitrus»](https://radiofundacao.net/projeto-novelo-vence-o-hack4guimaraes-2035-e-o-desafio-textvitrus/)
- FashionNetwork (PT): [notícia sobre a vitória no Hack4Guimarães 2035](https://pt.fashionnetwork.com/news/Hack4guimaraes-2035-engenheiros-de-barcelos-ganham-no-concurso-vimaranense-premio-de-7-500-euros-por-inovacao-na-gestao-dos-residuos-texteis-mais-1-000-pela-vitoria-no-desafio-da-vitrus-ambiente,1881327.html)

## Ligações

- [Repositório do Novelo](https://github.com/helderpgoncalves/novelo)
- [novelo.helder.si](https://novelo.helder.si)
- [Documentação do workflow com IA](https://github.com/helderpgoncalves/novelo/blob/main/docs/engenharia/workflow-ia.md), em `docs/engenharia/workflow-ia.md`

## Fontes

- APA, RARU 2025 (p. 24).
- Vitrus Ambiente, Relatório e Contas 2025 (p. 8).
- Hack4Guimarães 2035, FAQ oficial (consultada a 19 de outubro de 2026).
- Repositório do Novelo, README e `AGENTS.md` (commit a2ab9e1).
