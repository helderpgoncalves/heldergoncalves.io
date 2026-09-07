---
name: nova-app
description: Acrescenta uma aplicação nova ao sistema — o ícone, o conteúdo, o comportamento, os nomes nas duas línguas e o tamanho da janela. Usa quando alguém pedir uma app nova, um separador novo, ou uma secção nova que deva aparecer na Dock ou no ecrã inicial.
disable-model-invocation: true
argument-hint: [id-da-app]
arguments: [id]
---

# Aplicação nova: `$id`

Uma aplicação toca em seis sítios. Faz os seis, pela ordem, e não saltes
nenhum — cada um deixa o anterior a funcionar.

Se o `$id` vier vazio, pergunta qual é antes de começar. Um `id` é uma
palavra só, em minúsculas, sem acentos, e em português quando o resto
também está (`escritos`, `definicoes`).

## 1. A mecânica — `src/config/site.ts`

Acrescenta `'$id'` ao tipo `AppId` e uma entrada a `APPS`:

```ts
{ id: '$id', win: { w: 720, h: 520, minW: 420, minH: 360 }, dock: true, iosDock: false },
```

- `win` é o tamanho **pedido**; as janelas nunca passam de três quartos
  do ambiente de trabalho, por isso pede o que a app quer de verdade.
- `minW`/`minH` é onde o conteúdo ainda se lê. Escolhe a sério: é o que
  trava o redimensionamento.
- `dock` — aparece na Dock do Mac. `iosDock` — fica nas quatro de baixo
  do telefone em vez da grelha.
- `bare: true` se a app desenha a sua própria moldura (Terminal,
  Simulador) e não quer as margens normais.

## 2. Os nomes — `copy.pt.ts` **e** `copy.en.ts`

Em `apps`, nos **dois** ficheiros:

```ts
$id: { name: '…', subtitle: '…', window: '…' },
```

- `name` é um substantivo só, como as aplicações do sistema — *Perfil*,
  *Blog*, *Mail*. O que explica vai no `subtitle`.
- `window` é o título da barra, que pode ser diferente do nome (o Mail
  chama-se Mail e a janela chama-se *Nova mensagem*).

## 3. O ícone — `src/components/os/IconSprite.astro`

Um `<symbol id="icon-$id" viewBox="0 0 100 100">` com:

- um `<linearGradient>` novo em `<defs>`, a partir de uma cor de sistema
  do iOS: mais claro em cima, mais escuro em baixo;
- `clip-path="url(#sq)"` no grupo — é o canto contínuo da Apple, e é o
  mesmo para todos;
- o glifo com `translate(...) scale(...)` a dar-lhe cerca de 60% do
  lado, e traço na ordem dos 6% (≈ 5,6 a 6,0 em unidades de 100);
- os dois `<rect>` de acabamento, `url(#g-spot)` e `url(#g-shade)`;
- o `<path>` do contorno, com o mesmo `d` dos outros ícones.

Copia o `icon-sobre` e troca o gradiente e o glifo. Formas redondas
levam-se um pouco maiores do que as rectangulares — é sizing óptico, e é
por isso que os existentes variam entre 58% e 64%.

## 4. O conteúdo — `src/components/os/apps/`

Um `.astro` novo, e a linha correspondente no `Shell.astro`:

```astro
<section class="app-shell app-$id" data-content="$id" aria-label={c.apps.$id.name}>
  <div class="app-scroll"><div class="app-pad">…</div></div>
</section>
```

`data-content="$id"` é o que liga tudo: é por aí que o sistema encontra
o nó e o move entre a janela do Mac e a vista do telefone.

É HTML normal, e tem de fazer sentido lido sem JavaScript nenhum.

## 5. O comportamento — `src/scripts/os/apps/`

Só se a app tiver comportamento. Um ficheiro `$id.js`:

```js
export function init$Id(ctx) {
  const el = ctx.contentNode('$id');
  if (!el) return;
  // ...
}
```

E uma linha em `apps/index.js`, no `import` e na lista `APPS`.

O `if (!el) return` não é defensivo por defensivo: é o que deixa o mesmo
ficheiro servir os dois mundos sem saber em qual está.

## 6. O estilo

Só se precisar. Vai em `src/styles/os/apps.css`, e as regras de
`.claude/rules/apple.md` valem todas — sobretudo os cantos e a escala de
tipos.

## No fim

Corre `/verificar`. Depois diz, em duas frases, o que ficou feito e onde
— nada de listar os seis ficheiros outra vez.
