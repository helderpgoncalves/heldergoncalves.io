---
titulo: "The bitter lesson, and what to do with it"
resumo: "Seventy years of AI research fit into one uncomfortable idea. A reading note on Rich Sutton's essay, and what it asks of people who build products."
data: 2026-09-29
etiquetas: [Artificial intelligence, Reading, Essays]
par: a-licao-amarga
notificar: false
fonte:
  nome: "The Bitter Lesson — Rich Sutton, 2019"
  url: http://www.incompleteideas.net/IncIdeas/BitterLesson.html
---

Some texts take five minutes to read and years to finish reading. Rich Sutton's *The Bitter Lesson*, published in 2019, is one of them. The thesis fits in a sentence, and it is uncomfortable on purpose.

## The idea

Looking back over seventy years of artificial intelligence research, Sutton concludes that general methods, the ones that **scale with computation**, win in the end. They beat the methods that try to build our own knowledge of the problem into the system.

His examples are well known: chess, where brute-force search beat approaches that encoded the intuition of masters; Go; speech recognition; computer vision. In each, hand-written knowledge helped in the short term and was eventually overtaken by simpler methods that could use more compute.

The two methods he says keep scaling with no end in sight are **search** and **learning**.

## Why it is bitter

The lesson is bitter because it deflates a vanity. It is pleasant to believe that our understanding of the problem, our elegance, our rules, is what counts. It almost always delivers results, until it stops. And anyone who invested years in that understanding has to accept that much of it was scaffolding.

## What to do with it, when building products

I do not read the essay as an invitation to throw human judgment away. I read it as a question to ask before each design decision:

- **Will this rule I am hand-writing age well?** If a better model next year can absorb it, maybe it should not be fixed in code.
- **Does my system get better when the engine underneath gets better?** Products that gain from every advance, instead of needing to be rebuilt, are on the right side of the lesson.
- **Where is the human still needed?** Not in the arithmetic, but in what does not scale with computation: deciding what matters, verifying, taking responsibility.

The bitter lesson does not say our part disappears. It says it moved, and that it is worth finding out where.
