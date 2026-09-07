// As páginas do ecrã inicial. Arrastam-se com o dedo, param onde o
// dedo ia parar (não onde parou), e nas pontas fazem elástico em vez
// de bater numa parede.
import { track, rubber, clamp, project } from '../gesture.js';
import { EASE } from './motion.js';

/** Que fatia da largura é preciso percorrer para virar a página. */
const TURN = 0.28;

export function createPages(ph) {
  const { pages, dots } = ph.els;
  const count = pages ? pages.children.length : 1;
  let page = 0;

  function goTo(n, animate) {
    page = clamp(n, 0, count - 1);
    if (!pages) return;
    pages.style.transition = animate === false ? 'none' : 'transform .38s ' + EASE;
    pages.style.transform = 'translate3d(' + -page * 100 + '%,0,0)';
    if (dots) [...dots.children].forEach((d, i) => d.classList.toggle('on', i === page));
  }

  if (pages && count > 1) {
    track(
      pages,
      {
        begin: () => {
          pages.style.transition = 'none';
          pages.style.willChange = 'transform';
        },
        move: (g) => {
          const w = pages.clientWidth || 1;
          let dx = clamp(g.dx, -w, w);
          if ((page === 0 && dx > 0) || (page === count - 1 && dx < 0)) dx = rubber(dx, w * 0.4);
          pages.style.transform = 'translate3d(calc(' + -page * 100 + '% + ' + dx + 'px),0,0)';
        },
        end: (g) => {
          pages.style.willChange = '';
          const w = pages.clientWidth || 1;
          const predicted = g.dx + project(g.vx);
          if (predicted < -w * TURN) goTo(page + 1);
          else if (predicted > w * TURN) goTo(page - 1);
          else goTo(page);
        },
      },
      { axis: 'x', threshold: 10 }
    );
    goTo(0, false);
  }

  if (dots)
    dots.addEventListener('click', (ev) => {
      const i = [...dots.children].indexOf(ev.target);
      if (i >= 0) goTo(i);
    });

  return { goTo };
}
