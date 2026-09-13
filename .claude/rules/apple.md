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

## Que sistemas são estes

O telefone é **iOS 26**. O computador é **macOS 26 Tahoe**. Não é
detalhe de nomenclatura: é a régua contra a qual se decide se uma coisa
está certa. Quando tiveres dúvidas sobre o aspecto de uma app, vai ver
como ela é **nessas versões** — não em capturas de ecrã de há três anos,
que é o que a maior parte das pesquisas devolve.

O que estas duas trouxeram, e que este projecto segue:

- **Liquid Glass** em toda a camada de navegação — Dock, barra de menus,
  barras laterais, barras de ferramentas, os painéis do telefone. O
  material refracta o que está por baixo e reflecte a luz. Está feito,
  em `os/vidro.css`, com as cinco camadas; usa-o por `class="glass"` e
  não escrevas outro.
- **O vidro é da navegação, nunca do conteúdo.** O corpo de uma janela
  é opaco. Esta regra ficou mais importante em Tahoe, não menos.
- **A barra de separadores do iOS** é uma cápsula de vidro recuada do
  fundo do ecrã, já não uma barra encostada de lado a lado.
- **Os ícones são camadas de vidro** com profundidade, e existem em
  claro, escuro, tingido e transparente.

Uma app deste site é uma app daquele sistema: se a versão a sério mudou
de forma, a nossa muda também — e o que aqui está escrito muda com ela.

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

No telefone estes valores estão em `rem`, e a raiz é o corpo do sistema
(`font: -apple-system-body`, em `os/tipografia.css`): é assim que a
escala segue o Dynamic Type de quem o mudou nas Definições. Não voltes a
pôr os tokens do iOS em píxeis.

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

## A barra lateral flutua

**Isto é obrigatório no Mac**, e é a mudança de forma que o Tahoe trouxe
a toda a gente — Finder, Mail, Mensagens, Notas, Bolsa: são todas
assim, e uma app nossa que não seja denuncia-se de imediato.

Uma barra lateral do macOS 26 **já não é uma coluna encostada à parede
da janela com um risco a separá-la do conteúdo**. É um painel que
flutua por cima:

- **Recuada da moldura** — afasta-se da esquerda, do topo e do fundo do
  corpo da janela, e não encosta a nenhum deles.
- **Cantos contínuos**, como tudo o resto (ver acima).
- **Liquid Glass**: translúcida, refracta o que está por baixo e apanha
  a cor do papel de parede. É navegação, e por isso pode ser vidro — a
  regra de que o vidro nunca é do conteúdo continua de pé.
- **O conteúdo passa por trás dela.** A vista de detalhe começa na
  borda da janela, não onde a barra acaba; é isso que faz a barra
  parecer pousada em cima da app em vez de a cortar ao meio. Um risco
  vertical a separar as duas metades é exactamente o que deixou de
  existir.
- **A selecção é uma forma cheia** de cantos contínuos, dentro da
  barra, e não uma linha inteira pintada de lado a lado.

No telefone **não há nada disto**: no iOS navega-se por ecrãs, não por
uma coluna ao lado. A barra lateral flutuante é uma forma do Mac, e
aplicá-la ao iPhone seria inventar uma coisa que não existe.

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
- **Widgets**, num iPhone de 393 pontos: pequeno 158×158, médio 338×158,
  22 de folga entre colunas, 27 de margem ao ecrã, 16 de margem por
  dentro (11 no ambiente de trabalho do Mac, que é mais apertado), nada
  abaixo de 11 pontos de texto. Tocar num widget abre a aplicação dele,
  no sítio certo.
- **Orientação:** o telefone deitado tem regras próprias no fim de
  `os/ios.css`; o ecrã inicial não pode rebentar quando se roda.
- Margens em múltiplos de 8, com subdivisões de 4.
- Linha de texto até 68 caracteres.
