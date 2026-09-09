// As páginas do ecrã inicial. Arrastam-se com o dedo, param onde o
// dedo ia parar (não onde parou), e nas pontas fazem elástico em vez
// de bater numa parede. O assentar é uma mola que parte com a
// velocidade que o dedo trazia: largar depressa chega depressa.
//
// O SpringBoard real nunca corta nem rola uma página: se os widgets
// escolhidos deixam pouco espaço, os ícones que não cabem em linhas
// inteiras passam para a página seguinte — `reflow()` é isso.
import { track, rubber, clamp, project, spring } from '../gesture.js';

/** Que fatia da largura é preciso percorrer para virar a página. */
const TURN = 0.28;

export function createPages(ph) {
  const { pages, dots } = ph.els;
  let count = pages ? pages.children.length : 1;
  let page = 0;
  /** Onde a fila está agora, em píxeis. */
  let x = 0;
  let settling = null;

  const width = () => (pages && pages.clientWidth) || 1;

  const setX = (v) => {
    x = v;
    pages.style.transform = 'translate3d(' + v.toFixed(2) + 'px,0,0)';
  };

  const syncDots = () => {
    if (!dots) return;
    const have = dots.children.length;
    if (have < count) {
      for (let i = have; i < count; i++) dots.appendChild(document.createElement('i'));
    } else if (have > count) {
      for (let i = have - 1; i >= count; i--) dots.removeChild(dots.children[i]);
    }
    [...dots.children].forEach((d, i) => d.classList.toggle('on', i === page));
  };

  function goTo(n, opts = {}) {
    page = clamp(n, 0, count - 1);
    if (!pages) return;
    syncDots();
    if (settling) settling.cancel();
    const to = -page * width();
    if (opts.animate === false) {
      setX(to);
      return;
    }
    settling = spring(x, to, opts.velocity || 0, setX, { response: 0.45, damping: 0.9 });
    settling.then(() => (settling = null));
  }

  /**
   * Redistribui os ícones entre páginas para nenhum ficar meio visível.
   * Chama-se sempre que o que ocupa uma página muda — widgets escolhidos
   * de novo, ou o ecrã rodou. Os widgets nunca se mexem (o tamanho da
   * Apple não se negoceia); o que se move são os ícones a mais.
   */
  function reflow() {
    if (!pages) return;
    const icons = [...pages.querySelectorAll('.sb-app')];
    if (!icons.length) return;

    const first = pages.children[0];
    const cols = 4;
    const rowH = iconRowHeight(first) || 95;
    // Uma grelha nasce e morre consoante o espaço — mede-se o `row-gap`
    // e o `gap` entre widgets e grelha na própria `.sb-page`, que existe
    // sempre, em vez de depender de uma `.sb-grid` já lá estar.
    const pageGap = parseFloat(getComputedStyle(first).rowGap || getComputedStyle(first).gap) || 18;
    const gridProbe = document.createElement('div');
    gridProbe.className = 'sb-grid';
    gridProbe.style.visibility = 'hidden';
    first.appendChild(gridProbe);
    const rowGap = parseFloat(getComputedStyle(gridProbe).rowGap) || 18;
    gridProbe.remove();

    let i = 0;
    let pg = first;
    let pgIndex = 0;
    while (i < icons.length) {
      let grid = pg.querySelector('.sb-grid');
      const capacity = rowsThatFit(pg, rowH, rowGap, pageGap) * cols;
      if (capacity <= 0) {
        if (grid) grid.remove();
      } else {
        if (!grid) {
          grid = document.createElement('div');
          grid.className = 'sb-grid';
          pg.appendChild(grid);
        }
        for (let k = 0; k < capacity && i < icons.length; k++, i++) grid.appendChild(icons[i]);
      }
      pgIndex++;
      pg = pages.children[pgIndex];
      if (!pg && i < icons.length) pg = addPage();
    }
    // Sobrou uma página vazia (widgets removidos, menos ícones): tira-se,
    // desde que não seja a única.
    while (pages.children.length > 1) {
      const last = pages.children[pages.children.length - 1];
      const hasWidgets = last.querySelector('.sb-widgets')?.children.length;
      const hasIcons = last.querySelector('.sb-grid')?.children.length;
      if (hasWidgets || hasIcons) break;
      last.remove();
    }

    count = pages.children.length;
    goTo(Math.min(page, count - 1), { animate: false });
  }

  /** Uma página nova, com o mesmo molde de widgets que as outras têm. */
  function addPage() {
    const pg = document.createElement('div');
    pg.className = 'sb-page';
    const widgets = document.createElement('div');
    widgets.className = 'sb-widgets grid grid-cols-2 gap-x-[22px] gap-y-[18px] pt-1 [.editing-widgets_&]:pt-10';
    widgets.dataset.widgets = 'p' + (pages.children.length + 1);
    pg.appendChild(widgets);
    pages.appendChild(pg);
    return pg;
  }

  /** A altura de uma linha de ícone (rótulo incluído), medida na primeira. */
  function iconRowHeight(pg) {
    const app = pg.querySelector('.sb-app');
    return app ? app.getBoundingClientRect().height : 0;
  }

  /** Quantas linhas de `rowH` cabem depois do que a página já tem (widgets). */
  function rowsThatFit(pg, rowH, rowGap, pageGap) {
    const widgets = pg.querySelector('.sb-widgets');
    const used = widgets && widgets.children.length ? widgets.getBoundingClientRect().height + pageGap : 0;
    const free = pg.clientHeight - used;
    if (free < rowH) return 0;
    return 1 + Math.floor((free - rowH) / (rowH + rowGap));
  }

  if (pages) {
    const moveX = (g) => {
      const w = width();
      let dx = clamp(g.dx, -w, w);
      if ((page === 0 && dx > 0) || (page === count - 1 && dx < 0)) dx = rubber(dx, w * 0.4);
      setX(-page * w + dx);
    };
    const endX = (g) => {
      const w = width();
      const predicted = g.dx + project(g.vx);
      const next = predicted < -w * TURN ? page + 1 : predicted > w * TURN ? page - 1 : page;
      goTo(next, { velocity: g.vx });
    };

    track(
      pages,
      {
        begin: () => {
          if (settling) settling.cancel();
          settling = null;
          pages.style.willChange = 'transform';
        },
        move: (g) => count > 1 && moveX(g),
        end: (g) => {
          pages.style.willChange = '';
          if (count > 1) endX(g);
        },
      },
      { axis: 'x', threshold: 10 }
    );
    goTo(0, { animate: false });
    window.addEventListener('resize', reflow);
  }

  if (dots)
    dots.addEventListener('click', (ev) => {
      const i = [...dots.children].indexOf(ev.target);
      if (i >= 0) goTo(i);
    });

  return { goTo, current: () => page, reflow };
}
