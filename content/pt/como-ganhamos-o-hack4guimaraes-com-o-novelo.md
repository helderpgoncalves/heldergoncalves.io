---
titulo: "Como ganhámos o Hack4Guimarães com o Novelo"
resumo: "Cinco dias, da estratégia ao deploy: como lemos os critérios, organizámos o trabalho com IA e ganhámos o Hack4Guimarães 2035."
data: 2026-11-13
etiquetas: [Novelo, Hackathons, Inteligência artificial, Software]
par: how-we-won-hack4guimaraes-with-novelo
capa:
  imagem: novelo/hero.png
  alt: "Página de entrada do Novelo, com 301,3 toneladas de têxteis recolhidas à parte e cerca de 3 003 toneladas ainda no lixo."
notificar: false
rascunho: false
---

Às 19:17 de 19 de outubro entrou no repositório um commit de scaffold: 161 ficheiros, 10 395 linhas. Três minutos depois, às 19:20, entrou o primeiro ficheiro para agentes, o `AGENTS.md`, com skills, subagentes e hooks. Ainda não existia uma única funcionalidade.

Foi a decisão que menos se vê no produto, nos cinco dias do Hack4Guimarães 2035. Aqui fica a história: como lemos os critérios, como organizámos o trabalho com IA, o que mudou pelo caminho, como pusemos o Novelo no ar, e se faz sentido falar de «engenharia de fronteira» a propósito disto.

É comprido, e prefiro-o com os erros à vista.

## O que é o Novelo

É uma ferramenta de decisão que desenha a recolha seletiva de têxteis em Guimarães ao menor custo. Entra um orçamento. Saem cenários comparáveis em euros, toneladas e euros por tonelada, calculados por um otimizador sobre dados reais da Vitrus Ambiente. Está em [novelo.helder.si](https://novelo.helder.si).

Foi a nossa resposta ao desafio 5, «TexVitrus», da Vitrus Ambiente: recolha seletiva de têxteis com o menor investimento e o menor custo de operação.

Os números de partida: em 2025, Guimarães recolheu à parte 301,3 toneladas de têxteis. Ainda vão para o indiferenciado cerca de 3 003 toneladas por ano (51 250 t de indiferenciado vezes 5,86% de têxtil, a média nacional da APA no RARU 2025, aplicada ao concelho todo; é uma estimativa e está marcada como tal). A captura ronda 9,1%. **Mais de nove em cada dez quilos acabam no lixo**, e cada tonelada de indiferenciado custa 105,64 € a tratar, valor da Vitrus.

## Ler o enunciado como uma especificação

Os critérios públicos pesavam assim: inovação e originalidade 25%, viabilidade técnica 25%, impacto e relevância 30%, apresentação e potencial de continuidade 20%. Júri de especialistas, sem voto público. IA permitida, se identificada. Originalidade verificável pelo histórico do git, o que nos dava uma regra simples: nunca reescrever histórico.

Mas as palavras do enunciado diziam mais: «a inovação da solução, a solidez técnica do que foi construído, o impacto no território e a clareza com que a equipa o apresenta». E a FAQ pedia «um protótipo funcional com potencial de continuidade, não um produto acabado».

Lemos cada expressão como um requisito e perguntámos o que implicava:

- «Solidez técnica do que foi construído» deu a regra «sem teste ponta a ponta verde, não se mostra».
- «Protótipo com potencial de continuidade» deu o pedido final: um piloto de três meses em duas freguesias.

Daí saiu uma matriz: critério, prova, onde se mostra, nota de autoavaliação de 0 a 10. Demos 7, 6, 6 e 5, o que dá 6,05 ponderado, e fixámos como alvo 7,75. As lacunas maiores estavam à vista: o número de impacto assentava em custos estimados, a continuidade não tinha parceiro nem deck ensaiado, a viabilidade tinha funcionalidades por integrar.

Aqueles 6,05 e 7,75 são palpites nossos, não notas de ninguém. Nunca atualizámos a autoavaliação depois de a escrever. Serviu para ordenar o trabalho; como medida, não vale mais do que isso.

E nunca obtivemos o texto detalhado das Regras. Tudo o que escrevemos na coluna «o que o júri procura» foi hipótese, e está marcado como tal. A matriz evita trabalhar às cegas, mas não diz o que o júri pensa.

## O que fazia um número poder ir para o palco

A estratégia tinha peças pequenas e chatas, e é nelas que confio mais.

**Regra zero.** Nenhum número vai para um slide sem uma linha no registo de afirmações. O registo chegou a 150 linhas e 82 fontes, com estados: dado da Vitrus, fonte primária, secundária, por verificar, pressuposto, cálculo e falso. Ficaram 15 linhas «por verificar», e dizemo-lo. Os custos por hora e por quilómetro da Vitrus nunca nos chegaram: os custos são pressupostos visíveis, e a incerteza aparece no ecrã (tornado e Monte Carlo).

**Teste de entrada.** Cada funcionalidade e cada frase tinha de nomear o critério que sobe e a prova. Em empate, decidia o impacto, depois a viabilidade, depois a inovação.

**Ordem de corte.** Definida antes de haver pressa, porque com pressa decide-se mal.

**Perguntas de júri.** Escrevemos 48 perguntas possíveis, mais 12 por critério, com respostas de 20 segundos no máximo. Não sei quais saíram, e não vou fingir que sei.

**Planos B.** Vídeo, relatório pré-gerado, stack local, cenários pré-calculados. E uma lista de coisas que nunca diríamos: um número fora do registo; que a IA «identifica a fibra»; que a diretiva fixa metas; «validado por…» sem termos ouvido ninguém.

## O harness antes das funcionalidades

Voltemos às 19:20. O `AGENTS.md` é a fonte única de instruções do repositório. É lido pelo Claude Code, pelo GLM (via Z.ai/ZCode), pelo Cursor e pelo Codex. O `CLAUDE.md` é curto e só o importa. Na equipa usámos ferramentas diferentes e partilhámos o mesmo contexto e os mesmos procedimentos, que era a ideia.

Por cima disso, `.claude/skills/` tem 10 procedimentos com nome: `add-api-feature`, `add-web-feature`, `contract-gen`, `data-etl`, `deploy-coolify`, `llm-feature`, `novelo-context`, `optimization-model`, `ship` e `write-docs`. Em `.claude/agents/` há 8 subagentes finos (`api-engineer`, `web-engineer`, `optimization-engineer`, `data-engineer`, `ai-engineer`, `devops`, `reviewer`, `docs-writer`) que sabem pouco por si e delegam nas skills.

Acho que o ganho está aqui. Um agente sem contexto escreve código plausível. Um agente com procedimentos escritos escreve código que se parece com o resto.

**Contrato primeiro.** O FastAPI define o contrato com modelos Pydantic. Exporta-se um `openapi.json` versionado e o `just gen` gera o cliente TypeScript (hey-api). A web só consome o cliente gerado, e o gerado nunca se edita à mão. Depois de fixo o contrato, API e web avançam ao mesmo tempo, porque o que as liga é um ficheiro e não uma conversa.

**Hooks.** Dois, no `.claude/settings.json`: formatam Python e TypeScript depois de cada edição e bloqueiam edições a ficheiros gerados. Não confio numa instrução em prosa para o que tem de acontecer sempre. Se tem de acontecer sempre, é um hook.

**Paralelismo, depois do contrato.** Às 19:00 de 20 de outubro andavam várias frentes quase em simultâneo: pesquisa web e verificador de números no copiloto, a linguagem visual da marca, a interface. Quanto foi paralelo, e com que agentes, o git não diz.

## O que já sabíamos antes das 19:20

O `AGENTS.md` das 19:20 não saiu da cabeça em três minutos. Saiu de outros repositórios meus.

Num dos projetos há um `CLAUDE.md` desde 29 de julho e skills desde 25 de setembro. Noutro, desde 30 de setembro, com skills de migração de base de dados, de funcionalidade nova e de geração da API. Num terceiro, `AGENTS.md`, `CLAUDE.md` e agentes desde 11 de outubro, num monorepo FastAPI com Next.js, com `docker-compose` de produção para o Coolify e um Makefile. Não digo quais.

As ideias são as do Novelo com outros nomes: contrato, migração, funcionalidade nova, verificar, deploy. A stack também: FastAPI, PostgreSQL, React ou Next, Docker. No Novelo copiámos e adaptámos em horas, não inventámos. Um commit de 20 de outubro, às 09:58, ainda limpou referências à estrutura de onde partimos. Isto é o que o git prova, e prefiro-o a uma história mais heróica.

O resto é testemunho meu, e o git não o mostra. Trabalhamos sempre com vários agentes em paralelo. O que aprendemos em cada projeto vai para ficheiros que os agentes leem, em vez de ficar na cabeça, e por isso cada projeto novo começa com a lição dos anteriores. A forma de pensar, ler o enunciado como especificação e pôr as regras por escrito, também já vinha connosco.

Do paralelismo o git deixa um sinal fraco: commits no mesmo minuto. A 19 de outubro, às 21:07, às 22:57 e 22:58, e às 23:17 com quatro. Não diz que agentes eram.

Paralelizar tem custo, e volto a isso mais abaixo. Com o contrato fixo, as frentes ligam-se por um ficheiro. Sem ele, pisam-se umas às outras.

Acho que a vantagem real nem foi o paralelismo. Foi não partir do zero.

## A IA com rédea curta

O modelo, via OpenRouter, devolve JSON validado por Pydantic e nunca faz contas. Os números vêm do otimizador. O fluxo:

```text
pergunta em português
  → o modelo traduz para uma alteração estruturada (ScenarioDelta)
  → o utilizador confirma: «Entendi: …»
  → o otimizador calcula
  → o modelo escreve a explicação
  → o verificador rejeita qualquer número que não esteja nos resultados
  → se rejeitar, o modelo reescreve uma vez; à segunda, só a tabela
```

O Copiloto tem 52 ferramentas tipadas e as ações só avançam com confirmação. Um modelo de linguagem é bom a traduzir e a explicar, e mau a ser fonte de verdade. Pô-lo nas pontas, com um verificador à saída, deixa-o útil sem lhe dar poder sobre os números.

Avaliámo-lo com o modelo real, não com um simulado. A 22 de outubro, 146 de 155 casos passaram. A 23, com 180 casos e duas corridas, passaram 173 e 177, com 99% dos números verificados e 100% de resistência a injeção de prompt. A corrida inteira custou cerca de 0,10 dólares. Foi uma avaliação feita por nós, de equipa pequena. Serve para apanhar regressões. Um «E se» que não mudava nada, por exemplo, foi apanhado e corrigido a 22 de outubro.

A triagem por foto segue a mesma lógica, mas é a parte menos medida. Só fizemos testes pontuais com o modelo real, sem verdade-terreno. Com a etiqueta legível, a composição saiu certa nas peças testadas. O operador confirma sempre.

![A página de triagem do Novelo no computador e no telemóvel: foto de um cachecol de lã com etiqueta, sugestão do modelo com 97% de confiança e campos para o operador confirmar tipo, peso, estado e composição.](novelo/triagem.png "A triagem de peças. O modelo sugere, o operador confirma. Peça: Amin, CC BY-SA 4.0, Wikimedia Commons")

## Os cinco dias, com horas

O histórico completo tem 137 commits em cinco dias: 39 a 19 de outubro, 41 a 20, 28 a 21, 17 a 22 e 12 a 23. O que se segue vem do log, e só do log.

- **19 de outubro.** Às 14:59, o primeiro commit: nome, símbolo, paleta, fontes, proposta e arquitetura, 49 ficheiros e nenhum código. Às 19:17 o scaffold, às 19:20 o harness. Até às 19:50: autenticação, shell da web, esquema de dados, seed idempotente. Às 21:07, otimizador, «E se…?», lotes, passaporte e triagem. Às 22:57, o copiloto com ferramentas (101 ficheiros, 21 410 linhas). Entre as 22:34 e as 23:37, o dossiê de pesquisa, o registo de afirmações, a estratégia, a matriz e as 48 perguntas.
- **20 de outubro.** Commits à 00:43, 01:57 e 02:59, e depois nada até às 08:05. Às 10:58 chegou o pacote QGIS da Vitrus (2 751 contentores municipais, 2 026 locais). Às 12:00, a geometria única da marca. Às 23:45, o build de produção partiu.
- **21 de outubro.** De manhã, o ecrã de validação do modelo. Às 16:43, entram as respostas da Vitrus desse dia. Às 20:42, novo plano.
- **22 de outubro.** Auditoria de UX às páginas que o júri ia usar. Às 08:17, alinhámos as afirmações sobre a Diretiva (UE) 2025/1892 com o texto oficial. Às 14:48, vídeo e deck gerados dos dados. Às 17:34, novas respostas da Vitrus e recálculo de tudo. Às 17:49, a história do pitch em 5 minutos, com guião cronometrado.
- **23 de outubro.** Às 09:39, as rotas por estrada. Às 10:38, as fotos opcionais por peça (por causa do RGPD) e um seed de demonstração. Às 13:59, o Copiloto v6, o backup diário e o último commit de código de produto. A submissão fechava às 17h30. Às 15:17, o deck de 4 minutos.

Não há commits a 24 e 25 de outubro. O pitch foi a 26.

## O que desmentimos a nós próprios

A primeira versão do modelo foi desmentida duas vezes.

A 21 de outubro, a Vitrus respondeu que não tem nem quer contentores de têxtil. O nosso modelo escolhia locais para contentores, e deixou de fazer sentido. Passámos a um plano de saco nos circuitos porta a porta existentes. A 22 de outubro vieram novas respostas: o saco não pode ir no compactador e não há viaturas livres. Ficou uma viatura de têxtil nova, sem compactação, de 42 500 €, a sair do Estaleiro da Rua das Lameiras, em Polvoreira. Havia ainda um plano B, «usar viaturas livres à tarde», que caiu porque a folha de turnos tinha um erro.

Com 60 000 € por ano, o otimizador (CP-SAT para escolher os pontos, VRP para as rotas) dá 58 pontos em 43 freguesias e saco à porta em 3, mais 86 escolas. Zero contentores novos.

A base da procura também mudou, e os resultados com ela:

| Quando | Base da procura | Têxtil desviado | Custo por tonelada |
|-|-|-|-|
| 21/10, 16:43 | 43 051 t × 5,4% | 371,7 t | 124,3 € |
| 21/10, 20:42 | plano porta a porta | 396,2 t | 120,6 € |
| 22/10, 17:34 | 51 250,6 t × 5,86% = 3 003,3 t | 445,8 t | 102,8 € |
| 23/10 | o mesmo, com distâncias por estrada | 431,1 t | 101,9 € |

O último passo piorou o resultado, de 445,8 para 431,1 t, e deixou-o mais honesto. Estávamos a medir quilómetros em linha reta multiplicados por 1,3. O desvio mediano que medimos foi entre 1,37 e 1,48, por isso o 1,3 era otimista. Passámos a medir pela estrada, com um OSRM nosso sobre OpenStreetMap. A proposta inicial dizia ainda 55 freguesias e 156 277 habitantes. Os dados deram 48 freguesias e 156 830. Corrigimos a proposta e não os dados.

![O simulador do Novelo com orçamento de 60 000 € por ano: 431,1 t desviadas, 102 €/t, custo anual de 43 914 € e investimento de 57 000 €, todos marcados como estimativa.](novelo/simulador.png "O cenário de referência no simulador. Cada valor previsto traz a etiqueta «estimativa».")

O resultado final: custa 43 914 € por ano e desvia 431,1 t a 101,9 € por tonelada, das quais cerca de 256 t reutilizáveis. A captura passa de 9,1% para cerca de 22,2%. O tratamento evitado, 45 542 € por ano, paga a operação (35 702 €) e o custo total, o que deixa o custo líquido ligeiramente negativo. O investimento é de 57 000 €, dos quais 42 500 € são a viatura. Em 8 de cada 10 simulações, o custo fica entre 81,6 e 139,7 € por tonelada. É tudo estimativa, e o ecrã di-lo.

![Ecrã de cenários do Novelo com o mapa de Guimarães e as rotas da viatura de têxtil a partir do depósito de Polvoreira, 10 viagens e 407 km medidos pela estrada.](novelo/rotas.png "As rotas pela estrada, a partir do depósito. Este ecrã é de um cenário de locais reais, não o de referência do texto.")

## Erros que partiram coisas

Nem tudo foi estratégia. Os erros verdadeiros, tal como o histórico os mostra:

- Ativos da landing apagados por engano, e depois restaurados.
- Às 23:45 de 20 de outubro, uma chave de tradução em falta partiu o build de produção. Corrigido em minutos.
- Um crash na página inicial.
- Um script inline bloqueado pela política de segurança de conteúdos.
- Um «E se» vazio, que o eval apanhou.

O git só mostra o que foi corrigido. Não diz o que escapou.

## Como pusemos no ar

O Novelo corre numa VPS, gerida com o Coolify, a partir de um `docker-compose.yml`. O domínio `helder.si` já era meu, por isso foi só um registo A do subdomínio `novelo` para o IP da VPS, um recurso Docker Compose ligado ao GitHub e HTTPS automático pelo Traefik do Coolify. O compose não publica nenhuma porta. **Cada push na `main` é construído e posto no ar.**

São quatro serviços:

- **web**: nginx com a SPA, encaminha `/api` e deixa o stream do copiloto passar sem buffering.
- **api**: FastAPI, Python 3.12, utilizador sem privilégios. No arranque corre as migrações (Alembic) e o seed idempotente.
- **db**: Postgres 17.
- **osrm**: o OpenStreetMap de Portugal, recortado a Guimarães, com cerca de 340 MB e uns 60 MB de RAM. Se falhar, a API continua a funcionar e estima em linha reta.

Há limites de memória e CPU nos contentores (a 20 de outubro, às 15:35), healthchecks e dois endpoints, `/health` e `/ready`. As variáveis ficam só no Coolify.

Não tivemos CI remota. Fazíamos push direto para `main`, e o que fazia de rede de segurança era o `just check` local antes de cada push. O rollback é um `git revert` e outro push. O backup é diário, às 04:00: um `pg_dump` verificado com `pg_restore --list`, retenção de 30 dias. A 23 de outubro restaurámo-lo a sério numa base temporária, porque um backup que ninguém restaurou é uma esperança.

Depois do hackathon passámos a branch com pull request antes de `main`. Sem prazo, o atalho perdeu a razão.

## Porque iterámos depressa

Prefiro uma lista que se possa verificar a uma frase bonita:

- **Hot reload em Docker.** O `just dev` sobe tudo e recarrega ao gravar.
- **`just check-fast` abaixo de 90 segundos.** Corre em paralelo: ruff, mypy, pytest com xdist, biome, tsc, vitest, contrato e marca.
- **Uma base de dados por worker.** Cada worker do pytest tem a sua, clonada de um modelo. Sem testes a pisar dados uns dos outros.
- **Seed idempotente.** Correr duas vezes dá o mesmo.
- **Deploy no push.** O ciclo é fazer, verificar, empurrar, ver em produção.
- **Um ficheiro de contexto único.** Qualquer agente, com qualquer ferramenta, começa do mesmo sítio.

```bash
just check-fast   # para iterar: em paralelo, alvo abaixo de 90 s
just check        # limites reais do solver, antes de cada push
```

Os testes eram 1 037 na API e 437 na web a 22 de outubro, 1 164 e 449 a 23. No fim, o repositório tinha cerca de 137 000 linhas de Python e TypeScript. A abertura da página de entrada é testada em 13 tamanhos de ecrã, com Playwright.

Os números são nossos e verificáveis no repositório. Não temos medição independente de produtividade, e não quero que este texto sugira que temos.

## O que o repositório prova que sabemos fazer

O que o repositório mostra que sabemos fazer:

- **Otimização.** CP-SAT para escolher pontos e canais, VRP para as rotas, com leave-one-out e triangulação para validar o modelo.
- **API e web.** FastAPI com contrato tipado, cliente gerado, SPA, i18n em português e inglês, SSE no copiloto.
- **Dados e ETL.** Os ficheiros da Vitrus e o pacote QGIS (CAOP 2019 incluída) tratados num pipeline e processados dentro da imagem.
- **IA aplicada, com avaliação.** Ferramentas tipadas, verificador de números, eval com o modelo real.
- **DevOps.** Compose, Coolify, healthchecks, backup com restauro testado.
- **Marca e design.** Do nome ao banner, a partir de código.
- **Pesquisa regulatória.** Alinhar cada afirmação sobre a Diretiva (UE) 2025/1892 com o texto oficial.
- **Pitch, vídeo e deck.** Gerados dos dados.

Um parêntese honesto: o git não diz quem fez cada coisa nem quanto foi escrito com agentes. O Claude aparece como autor em 22 dos 137 commits, só entre as 16:43 de 21 de outubro e as 19:41 de 22. O resto da história não tem essa marca, e isso não quer dizer que não houve agentes.

## A marca

O nome já estava no primeiro commit, às 14:59 de 19 de outubro, com símbolo, paleta e fontes. O símbolo são três fios quase fechados à volta de um ponto: o têxtil que volta ao ciclo, o ponto de recolha, e uma abertura que diz que o ciclo ainda não está fechado. A paleta é Linho `#F4F1EA`, Tinta `#14211D` e Floresta `#2E6B57`, com Areia `#C4A06A` só como detalhe. As fontes são Newsreader e Inter, ambas SIL OFL.

O que quero deixar é a mecânica. O `just brand` regenera tudo de uma só geometria: símbolo, logotipos, favicon, ícones PWA, avatares, imagens de partilha por página e por idioma, e o banner. O `just check-brand` falha se houver mais de 0,5 px de desalinhamento. Quando um desenho muda, mudam todos.

A linguagem visual é o dither: fotografias livres de Guimarães em meio-tom a 45°, numa rampa Areia, Floresta e Tinta. É determinístico, a imagem de entrada não passa de 250 KB e o contraste AA é medido na geração.

![Banner do Novelo: o símbolo de três fios e a palavra Novelo em tipo serifado, por cima de uma paisagem em meio-tom nas cores areia e verde-floresta, com a frase «Recolha seletiva de têxteis, desenhada ao menor custo».|larga](novelo/marca-banner.png "O banner, gerado pelo mesmo comando que os restantes ativos da marca.")

## O pitch

Eram quatro minutos de pitch e um de perguntas. Começámos com 5 minutos e 8 slides, entre 19 e 22 de outubro, e acabámos com 10 slides em 4 minutos:

1. Capa: «mais de nove em cada dez quilos» (0:00).
2. O problema.
3. A lei.
4. «Ouvimos a Vitrus.»
5. A resposta.
6. O resultado: 431,1 t a 101,9 €/t, 45 542 € de tratamento evitado.
7. Demo ao vivo, das 2:05 às 3:05: o cenário de 60 000 €, a pergunta «E se 80 000 €?» e um lote com QR no telemóvel.
8. A IA.
9. Do saco ao fio.
10. O pedido: um piloto de três meses em duas freguesias.

![Diagrama do percurso do Novelo em seis passos: planear, decidir, recolher e triar, seguir, valorizar e prestar contas, com um fluxo em baixo do saco ao fio.](novelo/do-saco-ao-fio.png "O percurso inteiro, do saco ao fio. Cada passo alimenta o seguinte.")

O vídeo é de Remotion, tem 2 minutos e 14 segundos, 13 cenas, capturas reais da produção, números lidos de um JSON gerado a partir dos dados e uma banda sonora sintetizada em código. O deck é de pptxgenjs, com mapas reais e capturas de telemóvel uniformes a 390×844. Refizemos o vídeo pelo menos quatro vezes, e uma delas para incluir o «E se 80 000 €». Refazer custa pouco quando os números vêm de dados e não de um slide editado à mão.

O pitch foi a 26 de outubro e o prémio saiu a 28. Os ensaios não deixam rasto no git, por isso não os descrevo.

## «Frontier engineering» e o que fizemos

A expressão aparece a propósito de quem trabalha com agentes, e fui ver se quer dizer alguma coisa. A definição que uso é minha: «A Frontier Engineer (or Frontier Deployed Engineer) is a specialized software and AI engineer who designs, deploys, and manages systems where AI agents handle automated tasks while humans oversee critical decisions and production boundaries.» Ou seja: um engenheiro de software e de IA que desenha, põe em produção e gere sistemas onde os agentes tratam das tarefas automáticas e os humanos supervisionam as decisões críticas e as fronteiras de produção.

A pesquisa, a 13 de novembro de 2026, mostrou o seguinte:

- **Não há definição canónica.** A minha é razoável, não é um título normalizado.
- A ideia é próxima do texto da Kestra, empresa de orquestração, [«What is a Frontier Engineer»](https://kestra.io/blogs/what-is-a-frontier-engineer) (22 de setembro de 2026). É marketing de produto. Tem uma pergunta que achei útil (se isto falhar, quem repara, quão depressa e quanto custa desfazer?) e defende que um humano que aprova tudo sem mudar nada acrescenta pouco.
- A Anthropic anunciou a 2 de outubro de 2026 o [Claude Frontier Academy](https://www.anthropic.com/news/claude-frontier-academy), que quer formar 10 000 «Frontier Deployed Engineers» até ao fim de 2027, com formação e 12 semanas de residência numa organização. Pelo que li, é uma credencial e não um cargo estabelecido.
- Há vagas com o título «Frontier Engineer», por exemplo [na Cognizant](https://careers.cognizant.com/india-en/jobs/000702458411/frontier-engineer/) (10 de novembro de 2026), que pedem sobretudo agentes, RAG, avaliação e monitorização. «Frontier» descreve o tipo de tecnologia (modelos de ponta) e «Forward Deployed», da Palantir, o modo de trabalho (embebido no cliente). Nas vagas a fronteira entre os dois é difusa.

Aplicada ao que fizemos, só com o que o repositório mostra: os humanos decidiram as fronteiras. Nenhum número ia para o palco sem linha no registo de afirmações. A IA nunca fazia contas, e um verificador rejeitava números ausentes dos resultados. As ações do copiloto só corriam com confirmação do utilizador, e na triagem o operador confirma sempre. Dois hooks bloqueavam a edição de ficheiros gerados. Em produção, push em `main` fazia deploy automático, com o `just check` local como barreira, e o rollback era um `git revert`.

As práticas documentadas que já tinha comparado, mais curtas:

- **Contexto.** O `AGENTS.md` e as skills são uma forma modesta de [engenharia de contexto](https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents). O formato [AGENTS.md](https://agents.md) é aberto.
- **Arnês.** Chamo «harness» ao que montámos às 19:20 por analogia minha, não por seguir o texto da Anthropic sobre [arnês para agentes de longa duração](https://www.anthropic.com/engineering/effective-harnesses-for-long-running-agents).
- **Hooks.** As [boas práticas do Claude Code](https://code.claude.com/docs/en/best-practices) dizem: «If something has to happen every time, make it a hook, a deny rule, or a managed setting.»
- **Avaliações.** [«Demystifying evals for AI agents»](https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents) diz: «20-50 simple tasks drawn from real failures is a great start.» Tivemos 155 e depois 180 casos.
- **Multiagente.** A Anthropic [avisa](https://www.anthropic.com/engineering/multi-agent-research-system) que estes sistemas gastam cerca de 15 vezes os tokens de um chat. Por isso o paralelismo só veio depois de fixar o contrato.

Três limites. Não temos medição independente de produtividade. O git não diz quanto foi escrito com agentes. E ganhar não prova que esta seja a melhor organização.

Fica o teste da Kestra, e não passámos nele sem falhas. O build partido às 23:45 de 20 de outubro foi corrigido em minutos. Os ativos apagados por engano foram restaurados. Sem CI remota, a barreira era local, e dependia de nos lembrarmos de a correr. O git só mostra o que foi corrigido: se isto falhar, quem repara, quão depressa e quanto custa desfazer, quando ninguém deu pelo erro?

## Na imprensa

Da mais recente para a mais antiga, onde a data está confirmada; as restantes ficam sem data.

- ECO, 3 de novembro: [«Dois jovens de Barcelos querem desatar o nó da recolha de resíduos têxteis em Guimarães»](https://eco.sapo.pt/2026/11/03/dois-jovens-de-barcelos-querem-desatar-o-no-da-recolha-de-residuos-texteis-em-guimaraes/)
- Portugal Têxtil: [«Novelo quer tornar recolha de resíduos têxteis mais eficiente»](https://portugaltextil.com/novelo-quer-tornar-recolha-de-residuos-texteis-mais-eficiente/)
- E24, 29 de outubro: [«Guimarães: Plataforma “Novelo” vence Hack4Guimarães e combate lixo têxtil»](https://e24.pt/guimaraes-plataforma-novelo-vence-hack4guimaraes-e-combate-lixo-textil/)
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

- APA, RARU 2025.
- Vitrus Ambiente, Relatório e Contas 2025.
- Hack4Guimarães 2035, FAQ oficial (2026).
- Repositório do Novelo, README, `AGENTS.md` e `docs/engenharia/deploy.md`, e histórico git completo.
- Anthropic, [«Effective context engineering for AI agents»](https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents) (2025).
- Anthropic, [«Effective harnesses for long-running agents»](https://www.anthropic.com/engineering/effective-harnesses-for-long-running-agents) (2025).
- Anthropic, [«Demystifying evals for AI agents»](https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents) (2026).
- Anthropic, [«How we built our multi-agent research system»](https://www.anthropic.com/engineering/multi-agent-research-system) (2025).
- Kestra, [«What is a Frontier Engineer»](https://kestra.io/blogs/what-is-a-frontier-engineer) (2026).
- Anthropic, [«Claude Frontier Academy»](https://www.anthropic.com/news/claude-frontier-academy) (2026).
- Cognizant, [vaga «Frontier Engineer»](https://careers.cognizant.com/india-en/jobs/000702458411/frontier-engineer/) (2026).
- Claude Code, [Best practices](https://code.claude.com/docs/en/best-practices).
- [AGENTS.md](https://agents.md).
