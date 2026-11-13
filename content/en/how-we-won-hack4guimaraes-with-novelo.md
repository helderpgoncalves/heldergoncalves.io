---
titulo: "How we won Hack4Guimarães with Novelo"
resumo: "Five days, from strategy to deploy: how we read the criteria, organised the work with AI and won Hack4Guimarães 2035."
data: 2026-11-13
etiquetas: [Novelo, Hackathons, Artificial intelligence, Software]
par: como-ganhamos-o-hack4guimaraes-com-o-novelo
capa:
  imagem: novelo/hero.png
  alt: "Novelo's landing page, showing 301.3 tonnes of textiles collected separately and about 3,003 tonnes still going in the bin."
notificar: false
rascunho: false
---

At 19:17 on 19 October a scaffold commit landed in the repository: 161 files, 10,395 lines. Three minutes later, at 19:20, the first file for agents arrived, `AGENTS.md`, with skills, subagents and hooks. There wasn't a single feature yet.

Of the five days of Hack4Guimarães 2035, it was the decision you see least in the product. Here's the story: how we read the criteria, how we organised the work with AI, what changed along the way, how we put Novelo online, and whether it makes sense to talk about “frontier engineering” in this context.

It's long, and I'd rather have the mistakes in plain view.

## What Novelo is

It's a decision tool that designs separate textile collection in Guimarães at the lowest cost. You give it a budget. It returns scenarios you can compare in euros, tonnes and euros per tonne, calculated by an optimiser on real data from Vitrus Ambiente. It's online at [novelo.helder.si](https://novelo.helder.si).

It was our answer to challenge 5, “TexVitrus”, from Vitrus Ambiente: separate textile collection with the lowest investment and the lowest operating cost.

The starting numbers: in 2025, Guimarães collected 301.3 tonnes of textiles separately. About 3,003 tonnes a year still go into mixed waste (51,250 t of mixed waste times 5.86% textiles, the national average from the APA's RARU 2025, applied to the whole municipality; it's an estimate and it's marked as one). Capture sits around 9.1%. **More than nine in every ten kilos end up in the bin**, and every tonne of mixed waste costs €105.64 to treat, a figure from Vitrus.

## Reading the brief as a spec

The public criteria were weighted like this: innovation and originality 25%, technical feasibility 25%, impact and relevance 30%, presentation and potential for continuity 20%. A jury of experts, no public vote. AI allowed, if declared. Originality checkable through the git history, which gave us a simple rule: never rewrite history.

But the words of the brief said more: “the innovation of the solution, the technical soundness of what was built, the impact on the area and how clearly the team presents it”. And the FAQ asked for “a working prototype with potential for continuity, not a finished product”.

We read each phrase as a requirement and asked what it implied:

- “Technical soundness of what was built” gave us the rule “if the end-to-end test isn't green, we don't show it”.
- “Prototype with potential for continuity” gave us the final ask: a three-month pilot in two parishes.

Out of that came a matrix: criterion, proof, where it's shown, self-assessment score from 0 to 10. We gave ourselves 7, 6, 6 and 5, which is 6.05 weighted, and set 7.75 as the target. The biggest gaps were in plain sight: the impact figure rested on estimated costs, continuity had no partner and no rehearsed deck, and feasibility had features still to be integrated.

Those 6.05 and 7.75 are our own guesses, not anyone's marks. We never updated the self-assessment after writing it. It helped us put the work in order; as a measurement, it's worth no more than that.

And we never got the detailed text of the Rules. Everything we wrote in the “what the jury looks for” column was a hypothesis, and it's marked as one. The matrix stops you working blind, but it doesn't tell you what the jury thinks.

## What let a number go on stage

The strategy had small, boring pieces, and those are the ones I trust most.

**Rule zero.** No number goes on a slide without a line in the claims register. The register reached 150 lines and 82 sources, with statuses: Vitrus data, primary source, secondary, to be verified, assumption, calculation and false. 15 lines stayed “to be verified”, and we say so. Vitrus's costs per hour and per kilometre never reached us: the costs are visible assumptions, and the uncertainty shows on screen (tornado chart and Monte Carlo).

**Entry test.** Every feature and every sentence had to name the criterion it raises and the proof. In a tie, impact decided, then feasibility, then innovation.

**Order of cuts.** Defined before there was any rush, because under pressure you decide badly.

**Jury questions.** We wrote 48 possible questions, plus 12 per criterion, with answers of 20 seconds at most. I don't know which ones came up, and I won't pretend I do.

**Plans B.** Video, pre-generated report, local stack, pre-calculated scenarios. And a list of things we would never say: a number outside the register; that the AI “identifies the fibre”; that the directive sets targets; “validated by…” without having heard from anyone.

## The harness before the features

Back to 19:20. `AGENTS.md` is the single source of instructions in the repository. It's read by Claude Code, by GLM (via Z.ai/ZCode), by Cursor and by Codex. `CLAUDE.md` is short and only imports it. In the team we used different tools and shared the same context and the same procedures, which was the idea.

On top of that, `.claude/skills/` holds 10 named procedures: `add-api-feature`, `add-web-feature`, `contract-gen`, `data-etl`, `deploy-coolify`, `llm-feature`, `novelo-context`, `optimization-model`, `ship` and `write-docs`. In `.claude/agents/` there are 8 thin subagents (`api-engineer`, `web-engineer`, `optimization-engineer`, `data-engineer`, `ai-engineer`, `devops`, `reviewer`, `docs-writer`) that know little themselves and delegate to the skills.

I think this is where the gain is. An agent with no context writes plausible code. An agent with written procedures writes code that looks like the rest.

**Contract first.** FastAPI defines the contract with Pydantic models. A versioned `openapi.json` is exported and `just gen` generates the TypeScript client (hey-api). The web side only consumes the generated client, and generated code is never edited by hand. Once the contract is fixed, API and web move at the same time, because what connects them is a file and not a conversation.

**Hooks.** Two, in `.claude/settings.json`: they format Python and TypeScript after every edit and block edits to generated files. I don't trust a prose instruction for something that has to happen every time. If it has to happen every time, it's a hook.

**Parallelism, after the contract.** At 19:00 on 20 October several fronts were running almost at once: web research and a number checker in the copilot, the brand's visual language, the interface. How much was parallel, and with which agents, the git log doesn't say.

## What we already knew before 19:20

The `AGENTS.md` of 19:20 didn't come out of my head in three minutes. It came from other repositories of mine.

One of them has had a `CLAUDE.md` since 29 July and skills since 25 September. Another, since 30 September, with skills for database migrations, new features and API generation. A third has had `AGENTS.md`, `CLAUDE.md` and agents since 11 October, in a FastAPI and Next.js monorepo, with a production `docker-compose` for Coolify and a Makefile. I won't say which.

The ideas are Novelo's under other names: contract, migration, new feature, verify, deploy. The stack too: FastAPI, PostgreSQL, React or Next, Docker. With Novelo we copied and adapted in hours; we didn't invent. A commit on 20 October, at 09:58, was still cleaning up references to the structure we started from. That's what git proves, and I prefer it to a more heroic story.

The rest is my testimony, and git doesn't show it. We always work with several agents in parallel. What we learn in each project goes into files the agents read, instead of staying in our heads, so every new project starts with the lessons of the previous ones. The way of thinking, reading the brief as a spec and putting the rules in writing, also came with us.

On parallelism, git leaves a weak signal: commits in the same minute. On 19 October, at 21:07, at 22:57 and 22:58, and at 23:17 with four. It doesn't say which agents they were.

Parallelising has a cost, and I come back to that below. With the contract fixed, the fronts connect through a file. Without it, they tread on each other.

I think the real advantage wasn't even the parallelism. It was not starting from zero.

## AI on a short leash

The model, via OpenRouter, returns JSON validated by Pydantic and never does the sums. The numbers come from the optimiser. The flow:

```text
question in Portuguese
  → the model translates it into a structured change (ScenarioDelta)
  → the user confirms: "Entendi: …"
  → the optimiser calculates
  → the model writes the explanation
  → the verifier rejects any number that isn't in the results
  → if it rejects, the model rewrites once; the second time, only the table
```

The Copilot has 52 typed tools and actions only go ahead with confirmation. A language model is good at translating and explaining, and bad at being a source of truth. Putting it at the ends, with a verifier at the exit, keeps it useful without giving it any power over the numbers.

We evaluated it with the real model, not a mock. On 22 October, 146 of 155 cases passed. On the 23rd, with 180 cases and two runs, 173 and 177 passed, with 99% of numbers verified and 100% resistance to prompt injection. The whole run cost about $0.10. It was an evaluation done by us, a small team. It's there to catch regressions. An “What if” that changed nothing, for example, was caught and fixed on 22 October.

Photo sorting follows the same logic, but it's the least measured part. We only did spot tests with the real model, with no ground truth. With a legible label, the composition came out right on the items we tested. The operator always confirms.

![Novelo's sorting page on desktop and mobile: a photo of a wool scarf with its label, the model's suggestion with 97% confidence, and fields for the operator to confirm type, weight, condition and composition.](novelo/triagem.png "Sorting items. The model suggests, the operator confirms. Item: Amin, CC BY-SA 4.0, Wikimedia Commons")

## The five days, with times

The full history has 137 commits in five days: 39 on 19 October, 41 on the 20th, 28 on the 21st, 17 on the 22nd and 12 on the 23rd. What follows comes from the log, and only the log.

- **19 October.** At 14:59, the first commit: name, symbol, palette, fonts, proposal and architecture, 49 files and no code. The scaffold at 19:17, the harness at 19:20. By 19:50: authentication, web shell, data schema, idempotent seed. At 21:07, optimiser, “What if…?”, batches, passport and sorting. At 22:57, the copilot with tools (101 files, 21,410 lines). Between 22:34 and 23:37, the research dossier, the claims register, the strategy, the matrix and the 48 questions.
- **20 October.** Commits at 00:43, 01:57 and 02:59, and then nothing until 08:05. At 10:58 the Vitrus QGIS package arrived (2,751 municipal containers, 2,026 locations). At 12:00, the brand's single geometry. At 23:45, the production build broke.
- **21 October.** In the morning, the model validation screen. At 16:43, that day's answers from Vitrus came in. At 20:42, a new plan.
- **22 October.** UX audit of the pages the jury would use. At 08:17, we aligned the claims about Directive (EU) 2025/1892 with the official text. At 14:48, video and deck generated from the data. At 17:34, new answers from Vitrus and a recalculation of everything. At 17:49, the 5-minute pitch story, with a timed script.
- **23 October.** At 09:39, the road routes. At 10:38, optional photos per item (because of GDPR) and a demo seed. At 13:59, Copilot v6, the daily backup and the last commit of product code. Submissions closed at 17:30. At 15:17, the 4-minute deck.

There are no commits on 24 and 25 October. The pitch was on the 26th.

## What we proved wrong ourselves

The first version of the model was proved wrong twice.

On 21 October, Vitrus replied that it has no textile containers and doesn't want any. Our model chose sites for containers, and that stopped making sense. We moved to a bag plan on the existing door-to-door routes. On 22 October came new answers: the bag can't go in the compactor and there are no spare vehicles. What was left was one new textile vehicle, without compaction, at €42,500, leaving from the Estaleiro da Rua das Lameiras depot in Polvoreira. There was also a plan B, “use spare vehicles in the afternoon”, which fell through because the shift sheet had an error.

With €60,000 a year, the optimiser (CP-SAT to choose the points, VRP for the routes) gives 58 points across 43 parishes and door-to-door bags in 3, plus 86 schools. Zero new containers.

The demand baseline changed too, and the results with it:

| When | Demand baseline | Textiles diverted | Cost per tonne |
|-|-|-|-|
| 21/10, 16:43 | 43,051 t × 5.4% | 371.7 t | €124.3 |
| 21/10, 20:42 | door-to-door plan | 396.2 t | €120.6 |
| 22/10, 17:34 | 51,250.6 t × 5.86% = 3,003.3 t | 445.8 t | €102.8 |
| 23/10 | the same, with road distances | 431.1 t | €101.9 |

The last step made the result worse, from 445.8 to 431.1 t, and more honest. We had been measuring straight-line kilometres multiplied by 1.3. The median detour we measured was between 1.37 and 1.48, so the 1.3 was optimistic. We switched to measuring by road, with our own OSRM on OpenStreetMap. The original proposal still said 55 parishes and 156,277 inhabitants. The data gave 48 parishes and 156,830. We corrected the proposal and not the data.

![Novelo's simulator with a budget of €60,000 a year: 431.1 t diverted, €102 per tonne, annual cost of €43,914 and investment of €57,000, all marked as estimates.](novelo/simulador.png "The reference scenario in the simulator. Every projected value carries the label “estimate”.")

The final result: it costs €43,914 a year and diverts 431.1 t at €101.9 per tonne, of which about 256 t are reusable. Capture rises from 9.1% to about 22.2%. The treatment avoided, €45,542 a year, pays for the operation (€35,702) and the total cost, which leaves the net cost slightly negative. The investment is €57,000, of which €42,500 is the vehicle. In 8 out of 10 simulations, the cost lands between €81.6 and €139.7 per tonne. It's all an estimate, and the screen says so.

![Novelo's scenarios screen with a map of Guimarães and the textile vehicle's routes from the Polvoreira depot, 10 trips and 407 km measured by road.](novelo/rotas.png "Routes by road, from the depot. This screen shows a scenario with real sites, not the reference one from the text.")

## Mistakes that broke things

Not everything was strategy. The real mistakes, as the history shows them:

- Landing page assets deleted by mistake, and then restored.
- At 23:45 on 20 October, a missing translation key broke the production build. Fixed in minutes.
- A crash on the home page.
- An inline script blocked by the content security policy.
- An empty “What if”, which the eval caught.

Git only shows what was fixed. It doesn't say what slipped through.

## How we put it online

Novelo runs on a VPS, managed with Coolify, from a `docker-compose.yml`. I already owned the domain `helder.si`, so it was just an A record for the `novelo` subdomain pointing at the VPS's IP, a Docker Compose resource linked to GitHub and automatic HTTPS through Coolify's Traefik. The compose file publishes no ports. **Every push to `main` is built and put live.**

There are four services:

- **web**: nginx with the SPA, forwards `/api` and lets the copilot stream through without buffering.
- **api**: FastAPI, Python 3.12, unprivileged user. On startup it runs the migrations (Alembic) and the idempotent seed.
- **db**: Postgres 17.
- **osrm**: OpenStreetMap for Portugal, cut down to Guimarães, about 340 MB and some 60 MB of RAM. If it fails, the API keeps working and estimates in a straight line.

There are memory and CPU limits on the containers (on 20 October, at 15:35), healthchecks and two endpoints, `/health` and `/ready`. The variables live only in Coolify.

We had no remote CI. We pushed straight to `main`, and what acted as a safety net was the local `just check` before every push. Rollback is a `git revert` and another push. The backup is daily, at 04:00: a `pg_dump` verified with `pg_restore --list`, kept for 30 days. On 23 October we restored it for real into a temporary database, because a backup nobody has restored is a hope.

After the hackathon we moved to a branch with a pull request before `main`. With no deadline, the shortcut had no reason to exist.

## Why we iterated fast

I prefer a list you can check to a pretty sentence:

- **Hot reload in Docker.** `just dev` brings everything up and reloads on save.
- **`just check-fast` under 90 seconds.** It runs in parallel: ruff, mypy, pytest with xdist, biome, tsc, vitest, contract and brand.
- **One database per worker.** Each pytest worker has its own, cloned from a template. No tests treading on each other's data.
- **Idempotent seed.** Run it twice, get the same thing.
- **Deploy on push.** The loop is build, verify, push, see it in production.
- **A single context file.** Any agent, with any tool, starts from the same place.

```bash
just check-fast   # for iterating: in parallel, target under 90 s
just check        # real solver limits, before every push
```

The tests were 1,037 on the API and 437 on the web side on 22 October, 1,164 and 449 on the 23rd. In the end, the repository had about 137,000 lines of Python and TypeScript. The landing page opening is tested at 13 screen sizes, with Playwright.

The numbers are ours and can be checked in the repository. We have no independent measurement of productivity, and I don't want this text to suggest we do.

## What the repository proves we can do

What the repository shows we know how to do:

- **Optimisation.** CP-SAT to choose points and channels, VRP for the routes, with leave-one-out and triangulation to validate the model.
- **API and web.** FastAPI with a typed contract, generated client, SPA, i18n in Portuguese and English, SSE in the copilot.
- **Data and ETL.** The Vitrus files and the QGIS package (CAOP 2019 included) handled in a pipeline and processed inside the image.
- **Applied AI, with evaluation.** Typed tools, number verifier, eval with the real model.
- **DevOps.** Compose, Coolify, healthchecks, backup with a tested restore.
- **Brand and design.** From the name to the banner, generated from code.
- **Regulatory research.** Aligning every claim about Directive (EU) 2025/1892 with the official text.
- **Pitch, video and deck.** Generated from the data.

An honest aside: git doesn't say who did what or how much was written with agents. Claude appears as author on 22 of the 137 commits, only between 16:43 on 21 October and 19:41 on the 22nd. The rest of the history has no such mark, and that doesn't mean there were no agents.

## The brand

The name was already in the first commit, at 14:59 on 19 October, with symbol, palette and fonts. The symbol is three threads almost closed around a point: the textile that returns to the cycle, the collection point, and a gap that says the cycle isn't closed yet. The palette is Linho `#F4F1EA`, Tinta `#14211D` and Floresta `#2E6B57`, with Areia `#C4A06A` only as a detail. The fonts are Newsreader and Inter, both SIL OFL.

What I want to leave here is the mechanics. `just brand` regenerates everything from a single geometry: symbol, logotypes, favicon, PWA icons, avatars, share images per page and per language, and the banner. `just check-brand` fails if there's more than 0.5 px of misalignment. When a drawing changes, they all change.

The visual language is the dither: free photographs of Guimarães in halftone at 45°, on a ramp of Areia, Floresta and Tinta. It's deterministic, the input image is capped at 250 KB and AA contrast is measured at generation.

![Novelo banner: the three-thread symbol and the word Novelo in a serif typeface, over a halftone landscape in sand and forest green, with the line «Recolha seletiva de têxteis, desenhada ao menor custo» (separate textile collection, designed at the lowest cost).|larga](novelo/marca-banner.png "The banner, generated by the same command as the rest of the brand assets.")

## The pitch

It was four minutes of pitch and one of questions. We started with 5 minutes and 8 slides, between 19 and 22 October, and ended with 10 slides in 4 minutes:

1. Cover: “more than nine in every ten kilos” (0:00).
2. The problem.
3. The law.
4. “We listened to Vitrus.”
5. The answer.
6. The result: 431.1 t at €101.9/t, €45,542 of treatment avoided.
7. Live demo, from 2:05 to 3:05: the €60,000 scenario, the question “What if €80,000?” and a batch with a QR code on the phone.
8. The AI.
9. From bag to thread.
10. The ask: a three-month pilot in two parishes.

![Diagram of Novelo's journey in six steps: plan, decide, collect and sort, track, add value and report, with a flow underneath from bag to thread.](novelo/do-saco-ao-fio.png "The whole path, from bag to thread. Each step feeds the next.")

The video is made with Remotion, runs 2 minutes and 14 seconds, has 13 scenes, real captures from production, numbers read from a JSON generated from the data and a soundtrack synthesised in code. The deck is made with pptxgenjs, with real maps and phone captures uniform at 390×844. We redid the video at least four times, one of them to include the “What if €80,000”. Redoing costs little when the numbers come from data and not from a slide edited by hand.

The pitch was on 26 October and the prize came on the 28th. Rehearsals leave no trace in git, so I won't describe them.

## “Frontier engineering” and what we did

The phrase comes up in connection with people who work with agents, and I went to see whether it means anything. The definition I use is my own: “A Frontier Engineer (or Frontier Deployed Engineer) is a specialized software and AI engineer who designs, deploys, and manages systems where AI agents handle automated tasks while humans oversee critical decisions and production boundaries.”

The research, on 13 November 2026, showed the following:

- **There's no canonical definition.** Mine is reasonable, but it isn't a standardised title.
- The idea is close to a piece by Kestra, an orchestration company, [“What is a Frontier Engineer”](https://kestra.io/blogs/what-is-a-frontier-engineer) (22 September 2026). It's product marketing. It has a question I found useful (if this fails, who notices, how fast, and how much does it cost to undo?) and argues that a human who approves everything without changing anything adds little.
- Anthropic announced the [Claude Frontier Academy](https://www.anthropic.com/news/claude-frontier-academy) on 2 October 2026. It wants to train 10,000 “Frontier Deployed Engineers” by the end of 2027, with training and a 12-week residency in an organisation. From what I read, it's a credential, not an established job.
- There are job ads titled “Frontier Engineer”, for example [at Cognizant](https://careers.cognizant.com/india-en/jobs/000702458411/frontier-engineer/) (10 November 2026), which mostly ask for agents, RAG, evaluation and monitoring. “Frontier” describes the kind of technology (cutting-edge models) and Palantir's “Forward Deployed” the way of working (embedded with the client). In the ads, the line between the two is blurry.

Applied to what we did, and only with what the repository shows: humans decided the boundaries. No number went on stage without a line in the claims register. The AI never did sums, and a verifier rejected numbers absent from the results. The copilot's actions only ran with the user's confirmation, and in sorting the operator always confirms. Two hooks blocked edits to generated files. In production, a push to `main` deployed automatically, with the local `just check` as the barrier, and rollback was a `git revert`.

The documented practices I had already compared, shorter:

- **Context.** `AGENTS.md` and the skills are a modest form of [context engineering](https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents). The [AGENTS.md](https://agents.md) format is open.
- **Harness.** I call what we set up at 19:20 a “harness” by my own analogy, not because I followed Anthropic's text on [harnesses for long-running agents](https://www.anthropic.com/engineering/effective-harnesses-for-long-running-agents).
- **Hooks.** The Claude Code [best practices](https://code.claude.com/docs/en/best-practices) say: “If something has to happen every time, make it a hook, a deny rule, or a managed setting.”
- **Evaluations.** [“Demystifying evals for AI agents”](https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents) says: “20-50 simple tasks drawn from real failures is a great start.” We had 155 and then 180 cases.
- **Multi-agent.** Anthropic [warns](https://www.anthropic.com/engineering/multi-agent-research-system) that these systems use about 15 times the tokens of a chat. That's why parallelism only came after fixing the contract.

Three limits. We have no independent measurement of productivity. Git doesn't say how much was written with agents. And winning doesn't prove this is the best way to organise a team.

That leaves Kestra's test, and we didn't pass it cleanly. The build that broke at 23:45 on 20 October was fixed in minutes. The assets deleted by mistake were restored. With no remote CI, the barrier was local, and it depended on us remembering to run it. Git only shows what was fixed: if this fails, who notices, how fast, and how much does it cost to undo, when nobody noticed the mistake?

## In the press

Most recent first, where the date is confirmed; the rest are undated. Titles are in the original Portuguese, with a translation in brackets.

- ECO, 3 November: [«Dois jovens de Barcelos querem desatar o nó da recolha de resíduos têxteis em Guimarães»](https://eco.sapo.pt/2026/11/03/dois-jovens-de-barcelos-querem-desatar-o-no-da-recolha-de-residuos-texteis-em-guimaraes/) (two young people from Barcelos want to untie the knot of textile waste collection in Guimarães)
- Portugal Têxtil: [«Novelo quer tornar recolha de resíduos têxteis mais eficiente»](https://portugaltextil.com/novelo-quer-tornar-recolha-de-residuos-texteis-mais-eficiente/) (Novelo wants to make textile waste collection more efficient)
- E24, 29 October: [«Guimarães: Plataforma “Novelo” vence Hack4Guimarães e combate lixo têxtil»](https://e24.pt/guimaraes-plataforma-novelo-vence-hack4guimaraes-e-combate-lixo-textil/) (Guimarães: “Novelo” platform wins Hack4Guimarães and tackles textile waste)
- Mais Guimarães, 29 October: [«Engenheiros de Barcelos vencem Hack4Guimarães com um plano para recolher mais têxteis gastando menos»](https://maisguimaraes.pt/dupla-de-barcelos-vence-hack4guimaraes-com-um-plano-para-recolher-mais-texteis-gastando-menos) (engineers from Barcelos win Hack4Guimarães with a plan to collect more textiles for less)
- O Minho, 28 October: [«Engenheiros de Barcelos ganham prémio de 7.500 euros por inovação na gestão dos resíduos têxteis»](https://ominho.pt/engenheiros-de-barcelos-ganham-premio-de-7-500-euros-por-inovacao-na-gestao-dos-residuos-texteis/) (engineers from Barcelos win a €7,500 prize for innovation in textile waste management)
- Jornal T: [«Novelo propõe recolher 431 toneladas de têxteis por ano em Guimarães»](https://jornal-t.pt/noticia/novelo-propoe-recolher-431-toneladas-de-texteis-por-ano-em-guimaraes/) (Novelo proposes collecting 431 tonnes of textiles a year in Guimarães)
- O Amarense: [«Dois jovens de Barcelos vencem Hack4Guimarães 2035 com plataforma para recolha de resíduos têxteis»](https://oamarense.pt/dois-jovens-de-barcelos-vencem-hack4guimaraes-2035-com-plataforma-para-recolha-de-residuos-texteis/) (two young people from Barcelos win Hack4Guimarães 2035 with a textile waste collection platform)
- O Amarense, on the close of Economy Month: [«Autarca de Guimarães defende inovação e cooperação para reforçar economia local»](https://oamarense.pt/autarca-de-guimaraes-defende-inovacao-e-cooperacao-para-reforcar-economia-local/) (the mayor of Guimarães defends innovation and cooperation to strengthen the local economy)
- Rádio Alto Minho: [«“Novelo”: projeto de estudante e antigo aluno da UNIPVC vence dois prémios em Guimarães»](https://radioaltominho.pt/noticias/novelo-projeto-de-estudante-e-antigo-aluno-da-unipvc-vence-dois-premios-em-guimaraes/) (“Novelo”: project by a student and a former UNIPVC student wins two prizes in Guimarães)
- Rádio Fundação: [«Projeto ‘Novelo’ vence o Hack4Guimarães 2035 e o desafio TextVitrus»](https://radiofundacao.net/projeto-novelo-vence-o-hack4guimaraes-2035-e-o-desafio-textvitrus/) ('Novelo' project wins Hack4Guimarães 2035 and the TextVitrus challenge)
- FashionNetwork (PT): [article on the win at Hack4Guimarães 2035](https://pt.fashionnetwork.com/news/Hack4guimaraes-2035-engenheiros-de-barcelos-ganham-no-concurso-vimaranense-premio-de-7-500-euros-por-inovacao-na-gestao-dos-residuos-texteis-mais-1-000-pela-vitoria-no-desafio-da-vitrus-ambiente,1881327.html)

## Links

- [Novelo repository](https://github.com/helderpgoncalves/novelo)
- [novelo.helder.si](https://novelo.helder.si)
- [Documentation of the AI workflow](https://github.com/helderpgoncalves/novelo/blob/main/docs/engenharia/workflow-ia.md), at `docs/engenharia/workflow-ia.md`

## Sources

- APA, RARU 2025.
- Vitrus Ambiente, Annual Report 2025.
- Hack4Guimarães 2035, official FAQ (2026).
- Novelo repository, README, `AGENTS.md` and `docs/engenharia/deploy.md`, and the full git history.
- Anthropic, [“Effective context engineering for AI agents”](https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents) (2025).
- Anthropic, [“Effective harnesses for long-running agents”](https://www.anthropic.com/engineering/effective-harnesses-for-long-running-agents) (2025).
- Anthropic, [“Demystifying evals for AI agents”](https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents) (2026).
- Anthropic, [“How we built our multi-agent research system”](https://www.anthropic.com/engineering/multi-agent-research-system) (2025).
- Kestra, [“What is a Frontier Engineer”](https://kestra.io/blogs/what-is-a-frontier-engineer) (2026).
- Anthropic, [“Claude Frontier Academy”](https://www.anthropic.com/news/claude-frontier-academy) (2026).
- Cognizant, [“Frontier Engineer” job ad](https://careers.cognizant.com/india-en/jobs/000702458411/frontier-engineer/) (2026).
- Claude Code, [Best practices](https://code.claude.com/docs/en/best-practices).
- [AGENTS.md](https://agents.md).
