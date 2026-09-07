---
paths:
  - "src/scripts/**/*.js"
---

# O JavaScript do site

Sem frameworks e sem bibliotecas. Módulos ES normais, e mais nada.

## O padrão: um objecto partilhado

O Mac e o telefone eram, cada um, um closure gigante. Agora cada um é um
objecto — `desk` e `ph` — que o `index.js` monta e passa a cada peça. A
peça lê o que precisa e pendura-lhe o que oferece.

```js
desk.dock = createDock(desk);      // agora desk.dock existe
desk.windows = createWindows(desk); // e as janelas podem usá-lo
```

**As peças chamam-se sempre através do objecto**, nunca por importação
directa umas das outras. Não é estilo: elas chamam-se em círculo — abrir
uma app fecha os painéis, e o comutador abre apps — e uma importação
directa seria um ciclo. Através do objecto, a ligação resolve-se na hora
em que o utilizador toca, e a ordem de construção deixa de importar.

Uma peça nova é um ficheiro na pasta e uma linha no `index.js`.

## A API pública é só o que se usa

O que o `index.js` de cada mundo devolve é o que o resto do sistema pode
pedir — e nada mais. Se acrescentares uma função à API e ninguém a
chamar de fora, tira-a: fica interna à peça.

## As aplicações

Uma aplicação é um ficheiro em `apps/` e uma linha em `apps/index.js`.
A função recebe o contexto, procura o seu nó com `ctx.contentNode(id)`,
e **sai de mansinho se não o encontrar**:

```js
export function initAlgo(ctx) {
  const el = ctx.contentNode('algo');
  if (!el) return;
  // ...
}
```

É esse `if (!el) return` que deixa o mesmo código servir o Mac e o
telefone sem saber em qual está.

Ligam-se **uma vez**, ao conteúdo. Os nós movem-se entre janelas e
vistas e os listeners vão com eles: não há nada a religar quando uma
janela abre ou fecha.

## Texto

- `textContent` para pôr texto num nó. Sempre.
- `esc()` de `lib/dom.js` só quando é mesmo preciso construir marcação.
- Nunca `innerHTML` com coisa vinda do servidor ou do visitante.

## Gestos

Todos passam por `gesture.js` — `track`, `rubber`, `clamp`, `project`.
Não escrevas `pointerdown`/`pointermove` à mão: perdes a captura, o
eixo, a velocidade e o elástico, que são as quatro coisas que fazem um
gesto parecer nativo.

`project(v)` é o que dá o embalo: decide-se para onde o dedo *ia*, não
onde parou.

## Movimento

`reducedMotion()` de `state.js` antes de qualquer animação. Quem pediu
menos movimento leva o resultado, sem a viagem.

Nas transições do telefone há uma fórmula só — `p` de 0 (app inteira) a
1 (dentro do ícone) — e abrir, fechar e arrastar usam-na toda. Se
escreveres uma transição nova que não passe por `motion.js`, vai-se ver
o salto.

## O que pede ao servidor

`lib/session.js` é o único sítio que fala com `/api/token`. Um token por
envio — o servidor só aceita cada um uma vez.
