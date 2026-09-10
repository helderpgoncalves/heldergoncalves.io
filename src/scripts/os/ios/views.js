// ─────────────────────────────────────────────────────────────────────
// As vistas de aplicação, e a barra inferior que as governa.
//
// Estão no mesmo ficheiro porque partilham o modelo de movimento: a
// barra arrasta a app pelo caminho exacto que ela vai fazer ao ser
// largada, e é isso que faz o gesto não ter saltos. Separá-los era
// separar duas metades da mesma conta.
//
// Um só gesto na barra, três destinos: soltar em baixo mantém a app,
// arrastar para cima devolve ao início, e parar a meio caminho abre o
// comutador.
// ─────────────────────────────────────────────────────────────────────
import { reducedMotion } from '../state.js';
import { track, rubber, clamp, project } from '../gesture.js';
import { esc } from '../lib/dom.js';
import { CAN_ANIMATE, EASE, frame, radiusAt } from './motion.js';

/** Quanto do ecrã é preciso subir para a app ir toda ao ícone. */
const TRAVEL = 0.5;

/** Quanto tempo o dedo tem de ficar parado para armar o comutador, em ms. */
const STILL_FOR_SWITCHER = 130;

export function createViews(ph) {
  const { ctx, els, s, viewEls: views, stack } = ph;
  const { phone, sb, layer, homebar } = els;
  const { iconTarget, rectTarget, springboardAt, pushSpringboard } = ph.motion;

  let z = 10;

  function build(id) {
    const app = ph.meta(id);
    const view = document.createElement('section');
    view.className = 'ios-view';
    view.dataset.app = id;
    // Como no iOS, não há barra partilhada nem «Concluído»: cada app é
    // uma app, com o seu título grande, e sai-se pelo gesto da barra
    // inferior. Quem já desenha o próprio título (Blog, Bolsa, Projetos)
    // não leva outro por cima.
    view.innerHTML = '<div class="ios-view-body"></div>';
    const body = view.querySelector('.ios-view-body');
    if (!app.ownHead) {
      body.innerHTML =
        '<div class="ios-large"><h1>' + esc(app.name) + '</h1>' + (app.subtitle ? '<p>' + esc(app.subtitle) + '</p>' : '') + '</div>';
    }
    body.appendChild(ctx.contentEl(id));

    // Ao rolar, a app sabe-o (o Blog esconde o título grande, por
    // exemplo) — o mesmo sinal de sempre, sem barra a acender.
    view.addEventListener(
      'scroll',
      (ev) => {
        const top = ev.target && ev.target.scrollTop;
        view.classList.toggle('scrolled', typeof top === 'number' && top > 2);
      },
      true
    );

    layer.appendChild(view);
    views.set(id, view);
    return view;
  }

  function open(id, fromEl) {
    const view = views.get(id) || build(id);
    if (ph.current === id) return view;
    if (ph.current && views.get(ph.current)) views.get(ph.current).classList.remove('open');
    ph.current = id;

    const at = stack.indexOf(id);
    if (at >= 0) stack.splice(at, 1);
    stack.push(id);

    view.classList.add('open');
    view.style.zIndex = String(++z);
    view.style.transform = '';
    view.style.borderRadius = '';
    view.style.opacity = '';
    view.style.transition = '';
    pushSpringboard(true);
    layer.style.pointerEvents = 'auto';
    ctx.active = id;
    ph.panels.closeCC();
    ph.panels.closeNC();

    const target = fromEl && fromEl.getBoundingClientRect ? rectTarget(fromEl) : iconTarget(id);
    if (CAN_ANIMATE && !reducedMotion() && target) {
      view.animate(
        [
          { transformOrigin: '50% 50%', transform: frame(target, 1), borderRadius: radiusAt(1), opacity: 0.3 },
          { transformOrigin: '50% 50%', transform: 'none', borderRadius: '0px', opacity: 1 },
        ],
        { duration: 420, easing: EASE }
      );
    }
    return view;
  }

  /** Fecha a app visível. `from` é o ponto onde o dedo a deixou; com
   * `from.card`, a app encolhe até esse cartão do comutador em vez de
   * ir até ao ícone, e o ecrã inicial fica só meio-visível por trás. */
  function home(from) {
    if (!ph.current) return Promise.resolve();
    const view = views.get(ph.current);
    const id = ph.current;
    ph.current = null;
    ctx.active = null;
    layer.style.pointerEvents = 'none';
    const toCard = from && from.card ? from.card : null;

    const clear = () => {
      view.classList.remove('open');
      view.style.transform = '';
      view.style.borderRadius = '';
      view.style.opacity = '';
      view.style.transition = '';
      view.style.willChange = '';
      if (!toCard) pushSpringboard(false);
    };

    const target = toCard ? rectTarget(toCard) : iconTarget(id);
    if (!CAN_ANIMATE || reducedMotion() || !target) {
      if (toCard) springboardAt(0.35);
      clear();
      return Promise.resolve();
    }

    const p0 = from && typeof from.p === 'number' ? from.p : 0;
    const drift = from && from.drift ? from.drift : 0;
    // Para o cartão a app parte de onde o dedo a deixou (o quadro do
    // ícone em `p0`) e acaba inteira dentro do cartão, sem apagar.
    const start = toCard && from.p ? frame(iconTarget(id) || target, p0, drift) : frame(target, p0, drift);
    const anim = view.animate(
      [
        { transformOrigin: '50% 50%', transform: start, borderRadius: radiusAt(p0), opacity: 1 },
        { transformOrigin: '50% 50%', transform: frame(target, 1), borderRadius: radiusAt(1), opacity: toCard ? 1 : 0.25 },
      ],
      { duration: Math.round(300 + (1 - p0) * 90), easing: EASE }
    );

    // O ecrã inicial volta ao normal enquanto a app se afasta — mas a
    // partir de onde o dedo o deixou, senão salta. Para o comutador fica
    // a meio: desfocado e mais pequeno, por trás dos cartões.
    sb.classList.remove('pushed');
    sb.style.transition = 'none';
    springboardAt(Math.max(p0, 0.02));
    requestAnimationFrame(() => {
      sb.style.transition = 'transform .34s ' + EASE + ', opacity .26s linear, filter .3s linear';
      springboardAt(toCard ? 0.35 : 1);
      setTimeout(() => {
        sb.style.transition = '';
        if (toCard) return;
        sb.style.transform = '';
        sb.style.opacity = '';
        sb.style.filter = '';
      }, 370);
    });

    if (anim && anim.finished) return anim.finished.then(clear, clear);
    setTimeout(clear, 380);
    return Promise.resolve();
  }

  function close(id) {
    const view = views.get(id);
    if (!view) return;
    const wasCurrent = ph.current === id;
    const drop = () => {
      ctx.releaseContent(id);
      view.remove();
      views.delete(id);
      const at = stack.indexOf(id);
      if (at >= 0) stack.splice(at, 1);
    };
    if (wasCurrent) home().then(drop);
    else drop();
  }

  function teardown() {
    [...views.keys()].forEach((id) => {
      ctx.releaseContent(id);
      views.get(id).remove();
      views.delete(id);
    });
    stack.length = 0;
    ph.current = null;
    pushSpringboard(false);
    ph.switcher.close();
    ph.panels.closeCC();
    ph.panels.closeNC();
  }

  // ── A barra inferior ───────────────────────────────────────────────
  let drag = null;

  track(
    homebar,
    {
      begin: () => {
        if (!ph.current) {
          drag = null;
          return;
        }
        const view = views.get(ph.current);
        const target = iconTarget(ph.current);
        if (!view || !target) {
          drag = null;
          return;
        }
        view.style.transition = 'none';
        view.style.willChange = 'transform, border-radius';
        view.style.transformOrigin = '50% 50%';
        sb.classList.remove('pushed');
        sb.style.transition = 'none';
        drag = {
          view,
          target,
          p: 0,
          drift: 0,
          switcher: false,
          sideways: false,
          vertical: false,
          viewDx: 0,
          stillTimer: 0,
        };
      },

      move: (g) => {
        if (!drag) return;

        // De lado na barra inferior: passar à app anterior ou seguinte,
        // como no iPhone. Só enquanto o dedo não subir.
        if (!drag.vertical && Math.abs(g.dx) > Math.abs(g.dy) * 1.6 && Math.abs(g.dx) > 18) {
          drag.sideways = true;
          drag.viewDx = rubber(g.dx, 260);
          drag.view.style.transform = 'translate3d(' + drag.viewDx + 'px,0,0)';
          drag.view.style.borderRadius = '';
          return;
        }
        if (drag.sideways && Math.abs(g.dx) > Math.abs(g.dy)) return;
        drag.sideways = false;
        drag.vertical = true;

        const h = phone.clientHeight || 1;
        drag.p = clamp(Math.max(0, -g.dy) / (h * TRAVEL), 0, 0.86);
        // O dedo também leva a app de lado, mas com metade da força.
        drag.drift = g.dx * (1 - drag.p) * 0.45;

        // Parar a meio caminho é o sinal do comutador, como no iPhone.
        // Um dedo parado não manda eventos — por isso é um temporizador
        // que conta a paragem, rearmado a cada movimento; se nada mais
        // chegar, dispara sozinho. Depois de armado fica armado: só um
        // flick para cima, ao soltar, é que ainda vai para o início.
        clearTimeout(drag.stillTimer);
        if (!drag.switcher) {
          const state = drag;
          drag.stillTimer = setTimeout(() => {
            if (drag !== state || stack.length < 2 || state.p < 0.22) return;
            state.switcher = true;
            springboardAt(Math.min(state.p, 0.35));
            homebar.classList.add('armed');
          }, STILL_FOR_SWITCHER);
        }

        drag.view.style.transform = frame(drag.target, drag.p, drag.drift);
        drag.view.style.borderRadius = radiusAt(drag.p);
        springboardAt(drag.switcher ? Math.min(drag.p, 0.35) : drag.p);
      },

      end: (g) => {
        sb.style.transition = '';
        homebar.classList.remove('armed');
        if (!drag) return;
        const state = drag;
        clearTimeout(state.stillTimer);
        drag = null;
        state.view.style.transition = '';
        state.view.style.willChange = '';

        if (state.sideways) return finishSideways(state, g);

        const h = phone.clientHeight || 1;
        // Conta o embalo: para onde o dedo ia, não onde parou.
        const reach = -g.dy + project(-g.vy);

        if (state.switcher && g.vy > -0.5) {
          // O comutador abre já, e é ele que manda a app encolher até
          // ao cartão dela — ver switcher.js, `open`.
          ph.switcher.open({ view: state.view, p: state.p, drift: state.drift });
          return;
        }
        if (reach > h * 0.16 || g.vy < -0.5) {
          home({ p: state.p, drift: state.drift });
          return;
        }
        settleBack(state);
      },

      tap: () => {
        if (ph.current) home();
      },
    },
    // Sem app aberta a barra não agarra nada: em baixo do ecrã inicial
    // o dedo pertence às páginas.
    { threshold: 3, filter: () => !!ph.current }
  );

  /** Passagem lateral entre apps abertas. */
  function finishSideways(state, g) {
    const reach = state.viewDx + project(g.vx);
    const order = stack.slice();
    const at = order.indexOf(ctx.active || order[order.length - 1]);
    const next = reach < -70 ? order[at - 1] : reach > 70 ? order[at + 1] : null;
    state.view.style.transform = '';
    if (next && next !== ctx.active) return open(next);
    if (CAN_ANIMATE && !reducedMotion()) {
      state.view.animate([{ transform: 'translate3d(' + state.viewDx + 'px,0,0)' }, { transform: 'none' }], {
        duration: 240,
        easing: EASE,
      });
    }
  }

  /** Volta para a app, pelo mesmo caminho por onde ia a sair. */
  function settleBack(state) {
    if (CAN_ANIMATE && !reducedMotion()) {
      state.view.animate(
        [
          { transform: frame(state.target, state.p, state.drift), borderRadius: radiusAt(state.p) },
          { transform: 'none', borderRadius: '0px' },
        ],
        { duration: 260, easing: EASE }
      );
    }
    state.view.style.transform = '';
    state.view.style.borderRadius = '';
    sb.classList.add('pushed');
    sb.style.transform = '';
    sb.style.opacity = '';
    sb.style.filter = '';
  }

  return { open, close, home, teardown };
}
