// Voltar atrás pela margem esquerda.
//
// Sem elemento nenhum por cima do conteúdo: filtra-se pela posição do
// dedo, como no iOS, para não roubar toques aos botões encostados à
// esquerda.
//
// Serve qualquer aplicação que tenha uma folha por cima da lista — os
// Escritos com um texto aberto, a Bolsa com uma acção aberta. Cada uma
// diz aqui se tem folha, qual é, e como se fecha; o gesto é o mesmo.
import { track, clamp, project } from '../gesture.js';

/** A largura da margem que agarra o gesto, em píxeis. */
const EDGE = 28;

/** Que fatia da largura é preciso arrastar para voltar mesmo atrás. */
const COMMIT = 0.35;

/** As folhas que se arrastam para fechar, por aplicação. */
const SHEETS = {
  escritos: {
    has: (ctx) => !!ctx.escritos && ctx.escritos.hasDetail(),
    pane: (ctx) => ctx.escritos.pane(),
    back: (ctx) => ctx.run('back'),
  },
  bolsa: {
    has: (ctx, view) => !!view.querySelector('.app-bolsa.detail'),
    pane: (ctx, view) => view.querySelector('.stk-main'),
    back: (ctx, view) => view.querySelector('.app-bolsa').classList.remove('detail'),
  },
};

export function wireBackGesture(ph) {
  const { ctx, els } = ph;
  const { phone } = els;
  let pane = null;
  let sheet = null;

  const current = () => {
    const view = ph.current && ph.viewEls.get(ph.current);
    const def = SHEETS[ph.current];
    return view && def && def.has(ctx, view) ? { view, def } : null;
  };

  track(
    phone,
    {
      begin: () => {
        sheet = current();
        pane = sheet ? sheet.def.pane(ctx, sheet.view) : null;
        if (pane) {
          pane.classList.add('dragging');
          pane.style.transition = 'none';
        }
      },
      move: (g) => {
        if (!pane) return;
        pane.style.transform = 'translate3d(' + clamp(g.dx, 0, phone.clientWidth || 1) + 'px,0,0)';
      },
      end: (g) => {
        if (!pane) return;
        const el = pane;
        const { view, def } = sheet;
        pane = null;
        sheet = null;
        el.classList.remove('dragging');
        el.style.transition = '';
        if (g.dx + project(g.vx) > (phone.clientWidth || 1) * COMMIT) {
          // Deixa a folha onde está: o CSS leva-a o resto do caminho.
          def.back(ctx, view);
          setTimeout(() => (el.style.transform = ''), 20);
        } else {
          el.style.transform = '';
        }
      },
    },
    {
      axis: 'x',
      threshold: 12,
      filter: (ev) =>
        !!current() &&
        // Fora a barra inferior e os painéis: dois gestos a agarrar o
        // mesmo dedo é um gesto que não funciona.
        !ev.target.closest('.homebar, .cc, .nc, .switcher, .lock') &&
        ev.clientX - phone.getBoundingClientRect().left < EDGE,
    }
  );
}
