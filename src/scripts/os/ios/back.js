// Voltar atrás pela margem esquerda.
//
// Sem elemento nenhum por cima do conteúdo: filtra-se pela posição do
// dedo, como no iOS, para não roubar toques aos botões encostados à
// esquerda.
import { track, clamp, project } from '../gesture.js';

/** A largura da margem que agarra o gesto, em píxeis. */
const EDGE = 28;

/** Que fatia da largura é preciso arrastar para voltar mesmo atrás. */
const COMMIT = 0.35;

export function wireBackGesture(ph) {
  const { ctx, els } = ph;
  const { phone } = els;
  let pane = null;

  track(
    phone,
    {
      begin: () => {
        pane = ctx.escritos && ctx.escritos.hasDetail() ? ctx.escritos.pane() : null;
        if (pane) pane.classList.add('dragging');
      },
      move: (g) => {
        if (!pane) return;
        pane.style.transform = 'translate3d(' + clamp(g.dx, 0, phone.clientWidth || 1) + 'px,0,0)';
      },
      end: (g) => {
        if (!pane) return;
        const sheet = pane;
        pane = null;
        sheet.classList.remove('dragging');
        if (g.dx + project(g.vx) > (phone.clientWidth || 1) * COMMIT) {
          // Deixa a folha onde está: o CSS leva-a o resto do caminho.
          ctx.run('back');
          setTimeout(() => (sheet.style.transform = ''), 20);
        } else {
          sheet.style.transform = '';
        }
      },
    },
    {
      axis: 'x',
      threshold: 12,
      filter: (ev) =>
        ph.current === 'escritos' &&
        !!ctx.escritos &&
        ctx.escritos.hasDetail() &&
        // Fora a barra inferior e os painéis: dois gestos a agarrar o
        // mesmo dedo é um gesto que não funciona.
        !ev.target.closest('.homebar, .cc, .nc, .switcher, .lock') &&
        ev.clientX - phone.getBoundingClientRect().left < EDGE,
    }
  );
}
