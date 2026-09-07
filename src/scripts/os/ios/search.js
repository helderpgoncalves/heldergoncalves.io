// Puxar o ecrã inicial para baixo abre a pesquisa, como no iPhone.
//
// O ecrã segue o dedo com elástico — anda cada vez menos quanto mais se
// puxa — e ao largar assenta com uma mola. Se o dedo tiver puxado o
// suficiente, ou vinha com embalo, a pesquisa abre.
import { track, rubber, project, spring } from '../gesture.js';

/** Quanto é preciso puxar para a pesquisa abrir, em píxeis. */
const PULL = 64;

export function wireSearch(ph) {
  const { ctx, els } = ph;
  const { sb } = els;
  if (!sb) return;
  let settling = null;

  const place = (y) => {
    sb.style.transform = y ? 'translate3d(0,' + y.toFixed(2) + 'px,0)' : '';
  };

  track(
    sb,
    {
      begin: () => {
        if (settling) settling.cancel();
        sb.style.transition = 'none';
      },
      move: (g) => place(rubber(Math.max(0, g.dy), 140)),
      end: (g) => {
        const pulled = rubber(Math.max(0, g.dy), 140);
        settling = spring(pulled, 0, g.vy, place);
        settling.then(() => {
          settling = null;
          sb.style.transition = '';
        });
        if (g.dy + project(g.vy) > PULL) ctx.run('spotlight');
      },
    },
    {
      axis: 'y',
      threshold: 10,
      // Só com o ecrã inicial à vista, e nunca por cima da Dock ou dos
      // pontos das páginas — esses têm gestos seus.
      filter: (ev) => !ph.current && !ev.target.closest('.ios-dock, .sb-dots'),
    }
  );
}
