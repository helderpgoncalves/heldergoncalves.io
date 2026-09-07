---
paths:
  - "src/styles/*.css"
  - "src/styles/**/*.css"
  - "src/components/os/**/*.astro"
---

# A geometria da Apple

Estes valores não são gosto. São o que o sistema da Apple usa, e o
projecto inteiro assenta neles. Antes de escrever um `border-radius`,
um `font-size` ou uma cor, confere aqui.

## Cantos

Um canto da Apple **não é um arco de círculo**. O arco cobre 36° no
meio do canto; de cada lado entram duas Bézier que o entregam ao lado a
direito sem salto de curvatura — é o que a Apple chama *continuous*.

Duas consequências, e são as que interessam:

- o canto ocupa **1,6 × o raio** ao longo de cada lado;
- afunda-se para dentro **exactamente o mesmo** que um canto circular do
  mesmo raio (0,2929 × r nos dois casos).

Por isso o raio nominal é o de sempre; o que muda é a passagem.

**Em CSS**, não escrevas `border-radius` solto. Declara `--r` com o raio
nominal e deixa a tabela em `src/styles/os/apple.css` fazer o resto: é
ela que aplica `corner-shape: superellipse(1.777)` e multiplica o raio
por 1,6. Se a peça for nova, acrescenta-a às três listas dessa tabela.

**Excepções, que estão certas assim:**

- **Cápsulas** (`border-radius: 999px`) — as pontas de uma cápsula são
  semicírculos verdadeiros. `corner-shape` não entra.
- **Círculos** (`50%`) — idem.
- **Ícones** — a forma vem desenhada no caminho SVG, em
  `IconSprite.astro`, para não depender do suporte do browser. Raio de
  22,37% do lado, canto até 35,79, lado a direito só entre 35,79 e 64,21.

**Concentricidade:** raio de dentro = raio de fora − margem. Vale só
quando a peça de dentro encosta mesmo à de fora; um realce com folga à
volta não é concêntrico com nada.

## Tipos

Não há meios pontos. Cada tamanho é um degrau de uma das duas escalas,
e as duas são diferentes — não é gosto, é distância aos olhos.

| | large | title1 | title2 | title3 | headline | body | callout | subhead | foot | caption |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| macOS | 26 | 22 | 17 | 15 | 13 | 13 | 12 | 11 | 10 | 10 |
| iOS | 34 | 28 | 22 | 20 | 17 | 17 | 16 | 15 | 13 | 12 |

Usa `var(--t-body)`, `var(--t-foot)` e companhia. Um `font-size` em
píxeis crus só se justifica quando a peça existe num modo só.

## Cores

Usa os papéis, nunca um hexadecimal solto:

- `--accent` / `--blue`, `--green`, `--red`, `--orange`, `--yellow`,
  `--purple`, `--teal` — cada um com o valor certo em cada aparência;
- `--gray` a `--gray6` — a escala systemGray;
- `--ink`, `--ink-2`, `--ink-3` — o texto;
- `--surface`, `--surface-solid`, `--surface-2`, `--surface-3` — os
  fundos e os preenchimentos.

Os preenchimentos são cinzento com transparência, não preto: por cima de
fundos com cor misturam-se em vez de escurecerem.

Um hexadecimal cru só se escreve quando é mesmo uma cor de hardware — os
semáforos das janelas (`#ff5f57`, `#febc2e`, `#28c840`) são o caso.

## Vidro

Uma superfície de vidro leva `class="glass"` e as cinco camadas vêm de
`os/vidro.css`. As regras da Apple que já estão aplicadas lá:

- **Regular e Clear não se misturam.** `glass-clear` só onde o que está
  por baixo é forte e vivo — o papel de parede.
- **O vidro é da camada de navegação, nunca do conteúdo.** O corpo de
  uma janela é opaco.
- **Nunca vidro sobre vidro.** Dentro de uma superfície, separa-se com
  preenchimento e transparência.
- **Peças maiores são material mais espesso** — o desfoque cresce com o
  tamanho.

## Medidas

- Alvos de toque de **44×44 pontos** no telefone. Já está posto em
  `os/apple.css`; não o desfaças.
- Margens em múltiplos de 8, com subdivisões de 4.
- Linha de texto até 68 caracteres.
