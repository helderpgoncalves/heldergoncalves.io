---
titulo: "How we won Hack4Guimarães with Novelo"
resumo: "A team of two, AI agents and five days: how we organised the development to win Hack4Guimarães 2035."
data: 2026-11-13
etiquetas: [Novelo, Hackathons, Artificial intelligence, Software]
par: como-ganhamos-o-hack4guimaraes-com-o-novelo
capa:
  imagem: novelo/hero.png
  alt: "Novelo's landing page, showing 301.3 tonnes of textiles collected separately and about 3,003 tonnes still going in the bin."
notificar: false
rascunho: false
---

At 14:59 on 19 October we made the first commit. By 21:07 that day Novelo already had an optimiser, scenarios, batches, a passport and sorting. It wasn't haste. It was a decision made before writing any code: to organise the work the way you organise a system.

Novelo is quick to explain. How we built it interests me more, and that's what the rest of this text is about.

## What Novelo is

It's a decision tool that designs separate textile collection in Guimarães at the lowest cost. You give it a budget and a target. It returns scenarios you can compare in euros, tonnes, reusable tonnes and euros per tonne, calculated by an optimiser (OR-Tools: CP-SAT picks the points and channels, the VRP solver builds the routes) on real data from Vitrus Ambiente. It's online at [novelo.helder.si](https://novelo.helder.si). There are two of us: me and Flávio Fernandes.

It was our answer to challenge 5, âTexVitrusâ, at Hack4Guimarães 2035. Vitrus's question was this: âhow do we create a separate collection service for post-consumer textiles that guarantees reusable and recyclable material, with the lowest investment and the lowest operating cost?â

## The problem, in numbers

In 2025, Guimarães collected 301.3 tonnes of textiles separately. About 3,003 tonnes a year still go into mixed waste. The sum is 51,250 t of mixed waste times 5.86% textiles, the share from the APA's RARU 2025. Vitrus collected 43,050.5 t of that total, 84.0%, according to its 2025 Annual Report. It's an estimate, and it's marked as one in the repository.

Current capture sits around 9.1%: more than 9 in every 10 kilos end up in the bin. And the bin costs money: every tonne of mixed waste costs €105.64 to treat (€40 in tax plus €65.64 for Resinorte, figures from Vitrus). Separate textile collection has been mandatory since 1 January 2025.

## The answer we had to redo

The first version of the model was proved wrong. On 21 and 22 October, Vitrus told us it has no textile containers and doesn't want any: they get contaminated, and contamination destroys reuse, which is where the value is. And the bag can't go in the compactor. We rebuilt the model over those two days.

What we ended up with is a network around a single new textile vehicle, without compaction, leaving from the Estaleiro da Rua das Lameiras depot in Polvoreira. There's a sealed bag collected at the door, on a fixed day for each parish, and stops at existing municipal sites and at the 86 schools. Zero new containers.

With €60,000 a year, the optimiser gives 58 points across 43 parishes and door-to-door bags in 3. It costs €43,914 a year and diverts 431.1 t at €101.9 per tonne, of which about 256 t are reusable. Capture rises from 9.1% to about 22.2%. The treatment avoided, €45,542 a year, pays for the operation (€35,702) and the total cost: the net result is a saving of €1,628 a year. The investment is €57,000, of which €42,500 is the vehicle. In 8 out of 10 simulations the cost lands between €81.6 and €139.7 per tonne. All of this is an estimate, and the screen says so.

![Novelo's simulator with a budget of €60,000 a year: 431.1 t diverted, €102 per tonne, annual cost of €43,914 and investment of €57,000, all marked as estimates.](novelo/simulador.png âThe reference scenario in the simulator. Every projected value carries the label “estimate”.â)

Distances are measured by road, with our own OSRM on OpenStreetMap, and not as the crow flies. What we're asking Vitrus for is a three-month pilot in two parishes.

The rest is the development architecture.

## Reading the competition as a spec

The public criteria (the event's official FAQ, consulted on 19 October) were weighted like this: innovation and originality 25%, technical feasibility 25%, impact and relevance 30%, presentation and potential for continuity 20%. In-person pitch, a jury of experts, no public vote. AI allowed and encouraged, if declared. And the repositories' history could be checked. The brief summed up what counted: âthe innovation of the solution, the technical soundness of what was built, the impact on the area and how clearly the team presents itâ.

We treated that the way you treat a requirement. We made a matrix: criterion, proof, where it's shown, self-assessment score. The weighted starting score was 6.05 and the target 7.75 (our own estimates, between 19 and 25 October). The gaps were listed in order. On the first day we wrote a master strategy document, prepared 48 possible jury questions plus 12 per criterion, and left plans B for the pitch, the data and the mentoring.

The piece I like best is smaller: a register of claims. No number goes on stage without a verification status, that is, without knowing whether it comes from a primary source. In a competition about impact, it's the difference between saying â431 tonnesâ and being able to show where they come from.

## A rule zero for numbers

There's a rule in the repository that comes before all the others: anything that's a number uses real Vitrus data. A value either comes from the files, or is an assumption with a source, or carries âestimateâ on screen. There is no fourth option.

When Vitrus changed the basis for calculating textiles in mixed waste (0.7 kg per inhabitant per month, from a municipal plan; then 5.4%; then 5.86%, on 22 October), we redid everything. That was possible because the documents and `AGENTS.md` were updated in the same commit as the code. The rule only works if the source and the calculation travel together.

## One context for all the tools

`AGENTS.md` is the single source of instructions. I work with Claude Code, Flávio with GLM through Z.ai/ZCode, and the repository is also set up for Cursor and Codex. `CLAUDE.md` is short and only imports `AGENTS.md`. So two humans with different tools shared the same context and the same procedures.

On top of that, `.claude/skills/` holds 10 reusable procedures, each with its own name: `add-api-feature`, `add-web-feature`, `contract-gen`, `data-etl`, `deploy-coolify`, `llm-feature`, `novelo-context`, `optimization-model`, `ship` and `write-docs`. And `.claude/agents/` has 8 thin subagents (`api-engineer`, `web-engineer`, `optimization-engineer`, `data-engineer`, `ai-engineer`, `devops`, `reviewer`, `docs-writer`) that don't know much themselves: they delegate to the skills. The `novelo-context` skill has to be read before touching any numbers, which is rule zero showing up again, this time as a procedure.

I think this is where the real gain is. An agent without context writes plausible code. An agent with written procedures writes code that looks like the rest.

## Contract first

FastAPI defines the contract with Pydantic models. A versioned `openapi.json` is exported, and `just gen` generates the TypeScript client (with hey-api). The web side only consumes the generated client, and the generated code is never edited by hand. The hooks in `.claude/settings.json` format Python and TypeScript after every edit and block edits to generated files.

It looks like bureaucracy, but it's what makes parallel work possible. Once the contract is fixed, `api-engineer` and `web-engineer` run at the same time without treading on each other, because what connects them is a file and not a conversation.

## Quality gates, without CI

During the hackathon we had no remote CI. We pushed straight to `main`, and Coolify deployed on every push, on a VPS. So that this wasn't a gamble, the checks lived on our own machine, with `just`:

```bash
just check-fast   # for iterating: in parallel, VRP cut short, target under 90 s
just check        # real solver limits, target under 5 min, before every push
```

There are 1,164 tests on the API and 449 on the web side. Each pytest worker has its own database, cloned from a template. The landing page is tested at 13 screen sizes, with Playwright. Commits follow Conventional Commits. After the hackathon we moved to a branch with a pull request before `main`; with no deadline pressure, the shortcut had no reason to exist.

## AI on a short leash

The model, via OpenRouter, returns JSON validated by Pydantic and never does the sums. The numbers come from the optimiser. The flow is this: the user asks in Portuguese, the model turns the question into a structured change (a `ScenarioDelta`), the user confirms with a âGot it: …â, the optimiser calculates, the model writes the explanation, and a verifier rejects any number that doesn't exist in the results. If it rejects, the model rewrites once. The second time, the user gets only the table.

The Copilot has 52 typed tools, and actions only go ahead with confirmation. On 22 October we evaluated it with the real model: 180 cases in Portuguese and English, with 173 to 177 passing across two runs, 99% of numbers verified and 100% resistance to prompt injection.

Photo sorting follows the same logic. With a legible label, the composition came out right on every item we tested (5 compositions, with 86% to 97% confidence). With just the item and no label, the fibre stays âunknownâ, because the model doesn't guess. And the operator always confirms.

![Novelo's sorting page on desktop and mobile: a photo of a wool scarf with its label, the model's suggestion with 97% confidence, and fields for the operator to confirm type, weight, condition and composition.](novelo/triagem.png âSorting items. The model suggests, the operator confirms. Scarf photo: Amin, CC BY-SA 4.0, Wikimedia Commons.â)

I think the short leash is the most defensible architecture decision of all. A language model is good at translating and explaining, and bad at being a source of truth. Putting it at the ends, with a verifier at the exit, keeps it useful without giving it any power over the numbers.

## The pace, as the repository shows it

The repository has 138 commits, 120 of them in the five days of the marathon: 26 on 19 October, 41 on the 20th, 28 on the 21st, 16 on the 22nd and 9 on the 23rd. The log shows 102 commits from me, 21 from âClaudeâ, 14 from Flávio and 14 from dependabot.

On 22 October we ran a UX audit of the pages the jury would use, generated the presentation video and the deck from real data, and redid the vehicle model with Vitrus's answers from that day. On the morning of the 23rd came road routes with our own OSRM, optional photos per item (because of GDPR), a demo seed with 6 batches and 7 scenarios, and version 6 of the Copilot. Submissions closed that day at 17:30.

The marathon ran from 19 to 23 October and the presentation to the jury was on the 26th. 1st place at Hack4Guimarães 2035 (€7,500) and the win in the TexVitrus challenge (€1,000) add up to €8,500, handed over on 28 October 2026 at Guimarães's Economy Month. We used AI and said so, as the event asked.

## In the press

Most recent first, where the date is confirmed; the rest are undated. Titles are in the original Portuguese, with a translation in brackets.

- ECO, 3 November: [«Dois jovens de Barcelos querem desatar o nó da recolha de resíduos têxteis em Guimarães»](https://eco.sapo.pt/2026/11/03/dois-jovens-de-barcelos-querem-desatar-o-no-da-recolha-de-residuos-texteis-em-guimaraes/) (two young people from Barcelos want to untie the knot of textile waste collection in Guimarães)
- Portugal Têxtil, 29 October: [«Novelo quer tornar recolha de resíduos têxteis mais eficiente»](https://portugaltextil.com/novelo-quer-tornar-recolha-de-residuos-texteis-mais-eficiente/) (Novelo wants to make textile waste collection more efficient)
- E24, 29 October: [«Guimarães: Plataforma «Novelo» vence Hack4Guimarães e combate lixo têxtil»](https://e24.pt/guimaraes-plataforma-novelo-vence-hack4guimaraes-e-combate-lixo-textil/) (Guimarães: âNoveloâ platform wins Hack4Guimarães and tackles textile waste)
- Mais Guimarães, 29 October: [«Engenheiros de Barcelos vencem Hack4Guimarães com um plano para recolher mais têxteis gastando menos»](https://maisguimaraes.pt/dupla-de-barcelos-vence-hack4guimaraes-com-um-plano-para-recolher-mais-texteis-gastando-menos) (engineers from Barcelos win Hack4Guimarães with a plan to collect more textiles for less)
- O Minho, 28 October: [«Engenheiros de Barcelos ganham prémio de 7.500 euros por inovação na gestão dos resíduos têxteis»](https://ominho.pt/engenheiros-de-barcelos-ganham-premio-de-7-500-euros-por-inovacao-na-gestao-dos-residuos-texteis/) (engineers from Barcelos win a €7,500 prize for innovation in textile waste management)
- Jornal T: [«Novelo propõe recolher 431 toneladas de têxteis por ano em Guimarães»](https://jornal-t.pt/noticia/novelo-propoe-recolher-431-toneladas-de-texteis-por-ano-em-guimaraes/) (Novelo proposes collecting 431 tonnes of textiles a year in Guimarães)
- O Amarense: [«Dois jovens de Barcelos vencem Hack4Guimarães 2035 com plataforma para recolha de resíduos têxteis»](https://oamarense.pt/dois-jovens-de-barcelos-vencem-hack4guimaraes-2035-com-plataforma-para-recolha-de-residuos-texteis/) (two young people from Barcelos win Hack4Guimarães 2035 with a textile waste collection platform)
- O Amarense, on the close of Economy Month: [«Autarca de Guimarães defende inovação e cooperação para reforçar economia local»](https://oamarense.pt/autarca-de-guimaraes-defende-inovacao-e-cooperacao-para-reforcar-economia-local/) (Guimarães mayor defends innovation and cooperation to strengthen the local economy)
- Rádio Alto Minho: [«“Novelo”: projeto de estudante e antigo aluno da UNIPVC vence dois prémios em Guimarães»](https://radioaltominho.pt/noticias/novelo-projeto-de-estudante-e-antigo-aluno-da-unipvc-vence-dois-premios-em-guimaraes/) (âNoveloâ: project by a student and a former UNIPVC student wins two prizes in Guimarães)
- Rádio Fundação: [«Projeto ‘Novelo’ vence o Hack4Guimarães 2035 e o desafio TextVitrus»](https://radiofundacao.net/projeto-novelo-vence-o-hack4guimaraes-2035-e-o-desafio-textvitrus/) ('Novelo' project wins Hack4Guimarães 2035 and the TextVitrus challenge)
- FashionNetwork (PT): [article on the win at Hack4Guimarães 2035](https://pt.fashionnetwork.com/news/Hack4guimaraes-2035-engenheiros-de-barcelos-ganham-no-concurso-vimaranense-premio-de-7-500-euros-por-inovacao-na-gestao-dos-residuos-texteis-mais-1-000-pela-vitoria-no-desafio-da-vitrus-ambiente,1881327.html)

## Links

- [Novelo repository](https://github.com/helderpgoncalves/novelo)
- [novelo.helder.si](https://novelo.helder.si)
- [Documentation of the AI workflow](https://github.com/helderpgoncalves/novelo/blob/main/docs/engenharia/workflow-ia.md), at `docs/engenharia/workflow-ia.md`

## Sources

- APA, RARU 2025 (p. 24).
- Vitrus Ambiente, Annual Report 2025 (p. 8).
- Hack4Guimarães 2035, official FAQ (consulted on 19 October 2026).
- Novelo repository, README and `AGENTS.md` (commit a2ab9e1).
