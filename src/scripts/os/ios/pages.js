// As páginas do ecrã inicial. Arrastam-se com o dedo, param onde o
// dedo ia parar (não onde parou), e nas pontas fazem elástico em vez
// de bater numa parede. O assentar é uma mola que parte com a
// velocidade que o dedo trazia: largar depressa chega depressa.
import { track, rubber, clamp, project, spring } from '../gesture.js';

/** Que fatia da largura é preciso percorrer para virar a página. */
const TURN = 0.28;

export function createPages(ph) {
  const { pages, dots } = ph.els;
  const count = pages ? pages.children.length : 1;
  let page = 0;
  /** Onde a fila está agora, em píxeis. */
  let x = 0;
  let settling = null;

  const width = () => (pages && pages.clientWidth) || 1;

  const setX = (v) => {
    x = v;
    pages.style.transform = 'translate3d(' + v.toFixed(2) + 'px,0,0)';
  };

  function goTo(n, opts = {}) {
    page = clamp(n, 0, count - 1);
    if (!pages) return;
    if (dots) [...dots.children].forEach((d, i) => d.classList.toggle('on', i === page));
    if (settling) settling.cancel();
    const to = -page * width();
    if (opts.animate === false) {
      setX(to);
      return;
    }
    settling = spring(x, to, opts.velocity || 0, setX, { response: 0.45, damping: 0.9 });
    settling.then(() => (settling = null));
  }

  if (pages && count > 1) {
    track(
      pages,
      {
        begin: () => {
          if (settling) settling.cancel();
          settling = null;
          pages.style.willChange = 'transform';
        },
        move: (g) => {
          const w = width();
          let dx = clamp(g.dx, -w, w);
          if ((page === 0 && dx > 0) || (page === count - 1 && dx < 0)) dx = rubber(dx, w * 0.4);
          setX(-page * w + dx);
        },
        end: (g) => {
          pages.style.willChange = '';
          const w = width();
          const predicted = g.dx + project(g.vx);
          const next = predicted < -w * TURN ? page + 1 : predicted > w * TURN ? page - 1 : page;
          goTo(next, { velocity: g.vx });
        },
      },
      { axis: 'x', threshold: 10 }
    );
    goTo(0, { animate: false });
    window.addEventListener('resize', () => goTo(page, { animate: false }));
  }

  if (dots)
    dots.addEventListener('click', (ev) => {
      const i = [...dots.children].indexOf(ev.target);
      if (i >= 0) goTo(i);
    });

  return { goTo };
}
