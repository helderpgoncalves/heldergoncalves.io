---
titulo: "Start with the simplest thing that works"
resumo: "A reading note on Anthropic's \"Building effective agents\": workflows and agents are not the same thing, and the first is almost always enough."
data: 2026-09-22
etiquetas: [Artificial intelligence, Reading, Engineering]
par: comecar-pelo-mais-simples
notificar: false
fonte:
  nome: "Building effective agents — Anthropic, 2024"
  url: https://www.anthropic.com/engineering/building-effective-agents
---

Among the practical writing on systems built with language models, "Building effective agents", published by Anthropic in December 2024, is one of the pieces worth reading slowly. It does not sell a promise. It puts the words in order.

## Two different things with the same name

The central distinction is this. In a **workflow**, the path is written in code: the model is called at planned steps, and the program decides what comes next. In an **agent**, the model decides the path, picks the tools and keeps going until it thinks it is done.

They look like variations on one theme, but they behave very differently: a workflow is predictable and cheap to test; an agent is flexible, but costs more, takes longer and fails in ways that are harder to anticipate.

## The patterns, briefly

The text describes a few workflow patterns that cover a lot of ground: **chaining** prompts with a check in between; **routing** each request to the right handling; **parallelizing** independent parts; an **orchestrator** that splits work across others; and a loop where one model **evaluates** and improves another's output.

## The advice that stays

The recommendation I agree with most is the least spectacular one: **look for the simplest solution possible, and add complexity only when it is needed**. Often a single well-thought-out call, with good context, is already enough. An agent earns its place when the problem is open-ended, when you cannot predict the steps in advance, and when you can trust the model's judgment within limits.

It is the same instinct as any good craft: the most sophisticated tool is not the best one, the one the problem asks for is. And it pays to measure, to know whether the extra complexity is actually earning its keep.
