---
name: auditar-apple
description: Confere o que mudou contra os valores verdadeiros da Apple — cantos contínuos, escala de tipos, cores de sistema, cápsulas, concentricidade e alvos de toque. Usa depois de mexer em CSS, em ícones ou no visual de qualquer parte do site, e sempre que alguém disser que uma coisa não está igual ao macOS ou ao iOS.
context: fork
background: false
allowed-tools: Bash(git diff *), Bash(git status *), Bash(grep *), Read, Glob, Grep
---

# Auditoria

## O que mudou

!`git --no-pager diff --stat HEAD`

## O trabalho

Lê o diff completo com `git --no-pager diff HEAD` e, para cada linha de
CSS, ícone ou marcação que mudou, confere as sete coisas abaixo.

Não reescrevas nada. **Devolve uma lista de achados**, cada um com
ficheiro, linha, o que está lá, e o que devia estar. Se não houver
achados, di-lo numa frase — não inventes trabalho.

### 1. Cantos

- Um `border-radius` solto num rectângulo arredondado está errado. O
  padrão é declarar `--r` e deixar a tabela de `os/apple.css` aplicar
  `corner-shape: superellipse(1.777)` e o factor 1,6.
- Se a peça é nova, tem de estar **nas três listas** dessa tabela: a do
  `border-radius`, a do `@supports (corner-shape: squircle)` e a do
  `@supports (corner-shape: superellipse(1.777))`.
- `999px` e `50%` estão certos como estão — as pontas de uma cápsula e
  um círculo são arcos verdadeiros, e não levam `corner-shape`.
- Um pseudo-elemento com `border-radius: inherit` precisa também de
  `corner-shape: inherit`. Sem isso, sai redondo à volta de um canto
  contínuo — já aconteceu, e vê-se.

### 2. Tipos

Nenhum meio ponto. Cada tamanho é um degrau:

- macOS: 26 · 22 · 17 · 15 · 13 · 13 · 12 · 11 · 10
- iOS: 34 · 28 · 22 · 20 · 17 · 17 · 16 · 15 · 13 · 12 · 11

Um `font-size` em píxeis crus só passa se a peça existir num modo só.
Nos outros casos, é `var(--t-…)`.

### 3. Cores

Um hexadecimal cru é suspeito. Confere se existe um papel para ele:
`--accent`, `--blue`, `--green`, `--red`, `--gray`…`--gray6`, `--ink`,
`--ink-2`, `--ink-3`, `--surface*`.

Passam sem papel: os semáforos das janelas (`#ff5f57`, `#febc2e`,
`#28c840`), que são cor de hardware, e os gradientes dos ícones, que são
pares à volta de uma cor de sistema.

Confere também que a cor tem valor nas **duas aparências**. Uma cor
definida só no claro é um erro que só se vê no escuro.

### 4. Concentricidade

Onde uma peça encosta a outra: raio de dentro = raio de fora − margem.
Se houver folga à volta, **não** é concêntrico e a conta não se aplica —
não a apliques à força.

### 5. Alvos de toque

Tudo em que se carrega, no telefone, tem 44×44 no mínimo. Confere se a
peça nova está coberta pelas regras de `os/apple.css` ou se ficou de
fora.

### 6. Vidro

- Regular e Clear não se misturam.
- Nunca vidro sobre vidro: dentro de uma superfície separa-se com
  preenchimento, não com outra camada.
- O vidro é da camada de navegação; o corpo do conteúdo é opaco.

### 7. Acessibilidade

`prefers-reduced-motion`, `prefers-reduced-transparency` e
`prefers-contrast` já estão respeitados. Uma animação ou uma
transparência nova que não caia debaixo dessas regras é um achado.

## A forma da resposta

Uma lista, o mais grave primeiro. Cada achado numa ou duas linhas. Se
não houver nenhum, uma frase a dizer que está tudo dentro dos valores.
