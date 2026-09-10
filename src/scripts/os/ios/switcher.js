// ─────────────────────────────────────────────────────────────────────
// O comutador de aplicações — o baralho de cartões do iOS.
//
// Cada cartão é a app tal como estava (uma cópia da vista, à escala),
// com o ícone e o nome por cima. O mais recente fica à frente, à
// direita; os anteriores espreitam por trás, à esquerda, apertados.
// Desliza-se de lado com o embalo do dedo e assenta numa mola; um
// cartão empurrado para cima fecha a app, empurrado para baixo faz
// elástico; tocar num abre a app a crescer a partir dele.
//
// A app entra aqui a encolher até ao seu cartão (views.js, `home` com
// `card`), não até ao ícone — é o que faz o gesto não ter salto.
// ─────────────────────────────────────────────────────────────────────
import { track, rubber, clamp, project, spring } from '../gesture.js';
import { esc } from '../lib/dom.js';
import { EASE } from './motion.js';

/** Quanto é preciso empurrar para cima para o cartão sair, em píxeis. */
const FLICK_OUT = 110;
/** A largura de um cartão, como fracção do ecrã. */
const CARD = 0.68;
/** Distância entre cartões à direita do que está em foco. */
const STEP = 0.78;
/** Os cartões à esquerda do foco ficam apertados por este factor. */
const SQUEEZE = 0.28;
/** Onde começa o cartão em foco. */
const LEFT = 0.16;

export function createSwitcher(ph) {
  const { els, stack } = ph;
  const { switcher, phone } = els;
  const rail = switcher.querySelector('.switcher-rail');

  let items = [];
  let scroll = 0;
  let settling = null;

  const width = () => phone.clientWidth || 390;
  const cardW = () => Math.round(width() * CARD);
  const step = () => cardW() * STEP;
  const maxScroll = () => Math.max(0, (items.length - 1) * step());

  /** A posição de um cartão para um dado `scroll`: os que ficam para
   * a esquerda do foco apertam-se, os da direita mantêm o passo. */
  const xOf = (i, s) => {
    const raw = i * step() - s;
    return width() * LEFT + (raw >= 0 ? raw : raw * SQUEEZE);
  };

  function layout(s) {
    scroll = s;
    const cw = cardW();
    items.forEach((it, i) => {
      it.x = xOf(i, s);
      it.el.style.transform = 'translate3d(' + it.x.toFixed(2) + 'px,0,0)';
      it.el.style.zIndex = String(10 + i);
      // Um cartão quase todo tapado pelo seguinte fica só com o ícone a
      // espreitar: o nome apaga-se à medida que a folga encolhe.
      const gap = i + 1 < items.length ? xOf(i + 1, s) - it.x : cw;
      it.el.style.setProperty('--name', clamp((gap - cw * 0.3) / (cw * 0.25), 0, 1).toFixed(2));
    });
  }

  /** Uma cópia da vista, sem ids repetidos nem foco possível. */
  function snapshot(id) {
    const view = ph.viewEls.get(id);
    if (!view) return null;
    const copy = view.cloneNode(true);
    copy.removeAttribute('id');
    copy.querySelectorAll('[id]').forEach((n) => n.removeAttribute('id'));
    copy.classList.add('open');
    copy.setAttribute('inert', '');
    copy.setAttribute('aria-hidden', 'true');
    copy.style.cssText = '';
    return copy;
  }

  function build(id) {
    const app = ph.meta(id);
    const el = document.createElement('div');
    el.className = 'switcher-item';
    el.dataset.card = id;
    el.innerHTML =
      '<div class="card-label"><svg viewBox="0 0 100 100" aria-hidden="true"><use href="#icon-' + esc(id) + '"/></svg><strong>' + esc(app.name) + '</strong></div>' +
      '<div class="switcher-card"><div class="card-shot"></div></div>';
    const shot = snapshot(id);
    if (shot) el.querySelector('.card-shot').appendChild(shot);
    wireCard(el, id);
    return el;
  }

  function measure() {
    const w = width();
    const h = phone.clientHeight || 844;
    const cw = cardW();
    const k = cw / w;
    switcher.style.setProperty('--card-w', cw + 'px');
    switcher.style.setProperty('--card-h', Math.round(h * k) + 'px');
    switcher.style.setProperty('--shot-w', w + 'px');
    switcher.style.setProperty('--shot-h', h + 'px');
    switcher.style.setProperty('--shot-k', k.toFixed(4));
  }

  // ── Fechar uma app: empurrar o cartão para cima ─────────────────────
  function wireCard(el, id) {
    let lift = null;
    const place = (y) => {
      el.style.setProperty('--lift', y.toFixed(2) + 'px');
      el.style.setProperty('--shrink', String(1 - Math.min(0.06, Math.max(0, -y) / 2400)));
    };
    track(
      el,
      {
        begin: () => {
          if (lift) lift.cancel();
          el.classList.add('lifting');
        },
        move: (g) => {
          const y = Math.min(0, g.dy) + (g.dy > 0 ? rubber(g.dy, 90) : 0);
          place(y);
          el.style.opacity = String(clamp(1 + Math.min(0, g.dy) / 520, 0.25, 1));
        },
        end: (g) => {
          if (-g.dy + project(-g.vy) > FLICK_OUT) return dismiss(el, id);
          const y = Math.min(0, g.dy) + (g.dy > 0 ? rubber(g.dy, 90) : 0);
          el.style.opacity = '';
          lift = spring(y, 0, g.vy, place);
          lift.then(() => {
            lift = null;
            el.classList.remove('lifting');
          });
        },
        tap: () => {
          close({ keepSpringboard: true });
          ph.views.open(id, el.querySelector('.switcher-card'));
        },
      },
      { axis: 'y', threshold: 10 }
    );
  }

  function dismiss(el, id) {
    el.classList.add('leaving');
    el.style.setProperty('--lift', '-130%');
    el.style.setProperty('--shrink', '0.9');
    el.style.opacity = '0';
    setTimeout(() => {
      ph.views.close(id);
      el.remove();
      items = items.filter((it) => it.el !== el);
      if (!items.length) return close();
      // Os que ficam voltam a arrumar-se, com mola.
      const to = clamp(scroll, 0, maxScroll());
      if (settling) settling.cancel();
      settling = spring(scroll, to, 0, layout, { response: 0.4, damping: 1 });
    }, 230);
  }

  // ── Deslizar de lado ─────────────────────────────────────────────────
  let startScroll = 0;
  track(
    switcher,
    {
      begin: () => {
        if (settling) settling.cancel();
        settling = null;
        startScroll = scroll;
      },
      move: (g) => {
        let s = startScroll - g.dx;
        if (s < 0) s = -rubber(-s, 120);
        if (s > maxScroll()) s = maxScroll() + rubber(s - maxScroll(), 120);
        layout(s);
      },
      end: (g) => {
        const reach = scroll - project(g.vx);
        const to = clamp(Math.round(reach / step()) * step(), 0, maxScroll());
        settling = spring(scroll, to, -g.vx, layout, { response: 0.42, damping: 0.9 });
        settling.then(() => (settling = null));
      },
      tap: (g, ev) => {
        // Tocar fora dos cartões volta ao ecrã inicial.
        if (ev && ev.target && !ev.target.closest('.switcher-item')) close();
      },
    },
    { axis: 'x', threshold: 8 }
  );

  /** O cartão que vai receber a app, já no sítio — para `home` saber
   * até onde encolher. */
  function open(from) {
    if (!stack.length) return null;
    measure();
    rail.textContent = '';
    items = stack.map((id) => ({ id, el: build(id), x: 0 }));
    items.forEach((it) => rail.appendChild(it.el));
    layout(maxScroll());
    switcher.classList.add('open');
    const front = items[items.length - 1].el.querySelector('.switcher-card');
    if (ph.current) {
      // A app aberta encolhe até ao cartão da frente, que espera por ela
      // e só depois mostra a cópia. Vale para o gesto (com `from`) e para
      // o comutador aberto pelo menu ou pelo teclado.
      front.classList.add('waiting');
      const p = from && from.p ? from.p : 0;
      const drift = from && from.drift ? from.drift : 0;
      ph.views.home({ p, drift, card: front }).then(() => front.classList.remove('waiting'));
    } else {
      ph.motion.springboardAt(0.35);
    }
    return front;
  }

  function close(opts) {
    if (!switcher.classList.contains('open')) return;
    switcher.classList.remove('open');
    if (!(opts && opts.keepSpringboard)) ph.motion.pushSpringboard(false);
    setTimeout(() => {
      if (!switcher.classList.contains('open')) {
        rail.textContent = '';
        items = [];
      }
    }, 300);
  }

  window.addEventListener('resize', () => {
    if (!switcher.classList.contains('open')) return;
    measure();
    layout(clamp(scroll, 0, maxScroll()));
  });

  return { open, close };
}
