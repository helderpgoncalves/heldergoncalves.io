// O telefone. Ecrã inicial com páginas, aplicações que abrem a partir
// do próprio ícone, e gestos que seguem o dedo em tempo real: subir
// para o início, segurar para o comutador, puxar de cima para a Central
// de Controlo ou para as notificações, arrastar da margem para voltar
// atrás, e deslizar para desbloquear.
import { reducedMotion, effectiveTheme, setPref, prefs } from './state.js';
import { track, rubber, clamp, project } from './gesture.js';

const EASE = 'cubic-bezier(.32,.72,0,1)';
// Browsers antigos (Safari 12 e afins) não têm Web Animations. Em vez de
// partir, ficam sem a animação — o site funciona na mesma.
const CAN_ANIMATE =
  typeof Element !== 'undefined' &&
  typeof Element.prototype.animate === 'function';
const esc = (s) =>
  String(s).replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]);

export function createPhone(ctx) {
  const phone = document.getElementById('phone');
  const sb = document.getElementById('springboard');
  const pages = document.getElementById('sbPages');
  const dots = document.getElementById('sbDots');
  const layer = document.getElementById('iosViews');
  const cc = document.getElementById('cc');
  const nc = document.getElementById('nc');
  const lock = document.getElementById('lock');
  const homebar = document.getElementById('homebar');
  const island = document.getElementById('island');
  const switcher = document.getElementById('switcher');
  const s = ctx.data.strings;

  const views = new Map();
  const stack = [];
  let current = null;
  let z = 10;

  const meta = (id) => ctx.data.apps.find((a) => a.id === id);
  const iconFor = (id) => document.querySelector('.sb-app[data-open="' + id + '"] svg');

  // ── Ilha dinâmica ───────────────────────────────────────────
  let islandTimer = 0;
  function notify(text) {
    if (!island) return;
    island.querySelector('.island-text').textContent = text;
    island.classList.add('wide');
    clearTimeout(islandTimer);
    islandTimer = setTimeout(() => island.classList.remove('wide'), 2600);
  }

  // ── Vistas ──────────────────────────────────────────────────
  function build(id) {
    const app = meta(id);
    const view = document.createElement('section');
    view.className = 'ios-view';
    view.dataset.app = id;
    view.innerHTML =
      '<header class="ios-view-head glass">' +
      '<span class="lead-btn"></span>' +
      '<h2>' + esc(app.name) + '</h2>' +
      '<button class="trail-btn" type="button" data-view-done>' + esc(s.done) + '</button>' +
      '</header>' +
      '<div class="ios-view-body"></div>';
    view.querySelector('.ios-view-body').appendChild(ctx.contentEl(id));
    view.querySelector('[data-view-done]').addEventListener('click', () => home());
    // Como no iOS: o risco por baixo do título só aparece quando há
    // conteúdo a passar por trás dele.
    view.addEventListener(
      'scroll',
      (ev) => {
        const top = ev.target && ev.target.scrollTop;
        view.classList.toggle('scrolled', typeof top === 'number' && top > 2);
      },
      true
    );
    layer.appendChild(view);
    if (ctx.addGlass) ctx.addGlass(view.querySelector('.ios-view-head'));
    views.set(id, view);
    return view;
  }

  // ── O modelo de movimento ───────────────────────────────────
  // Abrir, fechar e arrastar usam TODOS a mesma fórmula, com o mesmo
  // ponto de origem. Era isto que faltava: antes o arrasto encolhia a
  // app pelo centro e a largada continuava a partir do canto — e via-se
  // o salto. Agora `p` vai de 0 (app inteira) a 1 (dentro do ícone), e
  // toda a gente concorda no caminho.
  function iconTarget(id) {
    const source = iconFor(id);
    const pr = phone.getBoundingClientRect();
    if (!source || !pr.width) return null;
    const r = source.getBoundingClientRect();
    if (!r.width) return null;
    return {
      s: Math.max(0.06, r.width / pr.width),
      x: r.left + r.width / 2 - (pr.left + pr.width / 2),
      y: r.top + r.height / 2 - (pr.top + pr.height / 2),
    };
  }

  const frame = (t, p, drift) =>
    'translate3d(' + (t.x * p + (drift || 0)) + 'px,' + t.y * p + 'px,0) scale(' + (1 - (1 - t.s) * p) + ')';

  const radiusAt = (p) => 28 * p + 'px';

  /** O ecrã inicial acompanha: aparece à medida que a app se afasta. */
  function springboardAt(p) {
    if (p <= 0) {
      sb.style.transform = '';
      sb.style.opacity = '';
      sb.style.filter = '';
      sb.classList.add('pushed');
      return;
    }
    sb.classList.remove('pushed');
    sb.style.transform = 'scale(' + (0.93 + 0.07 * p) + ')';
    sb.style.opacity = String(Math.min(1, p * 1.4));
    sb.style.filter = 'blur(' + (1 - p) * 6 + 'px)';
  }

  function open(id, fromEl) {
    const view = views.get(id) || build(id);
    if (current === id) return view;
    if (current && views.get(current)) views.get(current).classList.remove('open');
    current = id;
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
    closeCC();
    closeNC();

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

  /** O mesmo alvo, mas a partir de um elemento qualquer (um cartão). */
  function rectTarget(el) {
    const pr = phone.getBoundingClientRect();
    const r = el.getBoundingClientRect();
    if (!pr.width || !r.width) return null;
    return {
      s: Math.max(0.06, r.width / pr.width),
      x: r.left + r.width / 2 - (pr.left + pr.width / 2),
      y: r.top + r.height / 2 - (pr.top + pr.height / 2),
    };
  }

  function pushSpringboard(on) {
    sb.style.transform = '';
    sb.style.opacity = '';
    sb.style.filter = '';
    sb.classList.toggle('pushed', on);
  }

  /** Fecha a app visível. `from` é o ponto onde o dedo a deixou. */
  function home(from) {
    if (!current) return Promise.resolve();
    const view = views.get(current);
    const id = current;
    current = null;
    ctx.active = null;
    layer.style.pointerEvents = 'none';

    const clear = () => {
      view.classList.remove('open');
      view.style.transform = '';
      view.style.borderRadius = '';
      view.style.opacity = '';
      view.style.transition = '';
      view.style.willChange = '';
      pushSpringboard(false);
    };

    const target = iconTarget(id);
    if (!CAN_ANIMATE || reducedMotion() || !target) {
      clear();
      return Promise.resolve();
    }

    const p0 = from && typeof from.p === 'number' ? from.p : 0;
    const drift = from && from.drift ? from.drift : 0;
    const anim = view.animate(
      [
        { transformOrigin: '50% 50%', transform: frame(target, p0, drift), borderRadius: radiusAt(p0), opacity: 1 },
        { transformOrigin: '50% 50%', transform: frame(target, 1), borderRadius: radiusAt(1), opacity: 0.25 },
      ],
      { duration: Math.round(300 + (1 - p0) * 90), easing: EASE }
    );
    // O ecrã inicial volta ao normal enquanto a app se afasta — mas a
    // partir de onde o dedo o deixou, senão salta.
    sb.classList.remove('pushed');
    sb.style.transition = 'none';
    springboardAt(Math.max(p0, 0.02));
    requestAnimationFrame(() => {
      sb.style.transition = 'transform .34s ' + EASE + ', opacity .26s linear, filter .3s linear';
      springboardAt(1);
      setTimeout(() => {
        sb.style.transition = '';
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
    const wasCurrent = current === id;
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
    current = null;
    pushSpringboard(false);
    closeSwitcher();
    closeCC();
    closeNC();
  }

  // ── Gesto: a barra inferior ─────────────────────────────────
  // Um só gesto, três destinos: soltar em baixo mantém a app, arrastar
  // para cima devolve ao início, e parar a meio caminho abre o
  // comutador. A app segue o dedo pelo caminho exato que vai fazer ao
  // ser largada — nada salta.
  let drag = null;

  track(
    homebar,
    {
      begin: () => {
        if (!current) {
          drag = null;
          return;
        }
        const view = views.get(current);
        const target = iconTarget(current);
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
          still: 0,
          lastAt: performance.now(),
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
        const up = Math.max(0, -g.dy);
        drag.p = clamp(up / (h * 0.5), 0, 0.86);
        // O dedo também leva a app de lado, mas com metade da força.
        drag.drift = g.dx * (1 - drag.p) * 0.45;

        // Parar a meio caminho é o sinal do comutador, como no iPhone.
        const now = performance.now();
        if (Math.abs(g.vy) < 0.08 && Math.abs(g.vx) < 0.08) drag.still += now - drag.lastAt;
        else drag.still = 0;
        drag.lastAt = now;
        drag.switcher = stack.length > 1 && drag.p > 0.22 && drag.still > 130;

        drag.view.style.transform = frame(drag.target, drag.p, drag.drift);
        drag.view.style.borderRadius = radiusAt(drag.p);
        springboardAt(drag.switcher ? Math.min(drag.p, 0.35) : drag.p);
        homebar.classList.toggle('armed', drag.switcher);
      },
      end: (g) => {
        sb.style.transition = '';
        homebar.classList.remove('armed');
        if (!drag) return;
        const state = drag;
        drag = null;
        state.view.style.transition = '';
        state.view.style.willChange = '';

        // Passagem lateral entre apps abertas.
        if (state.sideways) {
          const reach = state.viewDx + project(g.vx);
          const order = stack.slice();
          const at = order.indexOf(ctx.active || order[order.length - 1]);
          const next = reach < -70 ? order[at - 1] : reach > 70 ? order[at + 1] : null;
          state.view.style.transform = '';
          if (next && next !== ctx.active) {
            open(next);
            return;
          }
          if (CAN_ANIMATE && !reducedMotion()) {
            state.view.animate([{ transform: 'translate3d(' + state.viewDx + 'px,0,0)' }, { transform: 'none' }], {
              duration: 240,
              easing: EASE,
            });
          }
          return;
        }

        const h = phone.clientHeight || 1;
        // Conta o embalo: para onde o dedo ia, não onde parou.
        const reach = -g.dy + project(-g.vy);
        const wantsHome = reach > h * 0.16 || g.vy < -0.5;

        if (state.switcher) {
          home({ p: state.p, drift: state.drift }).then(openSwitcher);
          return;
        }
        if (wantsHome) {
          home({ p: state.p, drift: state.drift });
          return;
        }
        // Volta para a app, pelo mesmo caminho.
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
      },
      tap: () => {
        if (current) home();
      },
    },
    // Sem app aberta a barra não agarra nada: em baixo do ecrã inicial
    // o dedo pertence às páginas.
    { threshold: 3, filter: () => !!current }
  );

  // ── Gesto: páginas do ecrã inicial ──────────────────────────
  let page = 0;
  const pageCount = pages ? pages.children.length : 1;

  function goToPage(n, animate) {
    page = clamp(n, 0, pageCount - 1);
    if (!pages) return;
    pages.style.transition = animate === false ? 'none' : 'transform .38s ' + EASE;
    pages.style.transform = 'translate3d(' + -page * 100 + '%,0,0)';
    if (dots) [...dots.children].forEach((d, i) => d.classList.toggle('on', i === page));
  }

  if (pages && pageCount > 1) {
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
          if ((page === 0 && dx > 0) || (page === pageCount - 1 && dx < 0)) dx = rubber(dx, w * 0.4);
          pages.style.transform = 'translate3d(calc(' + -page * 100 + '% + ' + dx + 'px),0,0)';
        },
        end: (g) => {
          pages.style.willChange = '';
          const w = pages.clientWidth || 1;
          // Onde o dedo ia parar, não onde estava.
          const predicted = g.dx + project(g.vx);
          if (predicted < -w * 0.28) goToPage(page + 1);
          else if (predicted > w * 0.28) goToPage(page - 1);
          else goToPage(page);
        },
      },
      { axis: 'x', threshold: 10 }
    );
    goToPage(0, false);
  }

  if (dots)
    dots.addEventListener('click', (ev) => {
      const i = [...dots.children].indexOf(ev.target);
      if (i >= 0) goToPage(i);
    });

  // ── Gesto: painéis que descem de cima ───────────────────────
  function panel(el, hotspot, onOpen) {
    if (!el) return { open: () => {}, close: () => {} };
    const openIt = () => {
      el.style.transition = '';
      el.style.transform = '';
      el.classList.add('open');
      if (onOpen) onOpen();
    };
    const closeIt = () => {
      el.style.transition = '';
      el.style.transform = '';
      el.classList.remove('open');
    };

    if (hotspot)
      track(
        hotspot,
        {
          begin: () => {
            el.classList.add('open', 'dragging');
            el.style.transition = 'none';
            el.style.willChange = 'transform';
            if (onOpen) onOpen();
          },
          move: (g) => {
            const h = phone.clientHeight || 1;
            const p = clamp(g.dy / h, 0, 1);
            el.style.transform = 'translate3d(0,' + (p - 1) * 100 + '%,0)';
          },
          end: (g) => {
            el.classList.remove('dragging');
            el.style.transition = '';
            el.style.willChange = '';
            const h = phone.clientHeight || 1;
            if (g.dy + project(g.vy) > h * 0.16) openIt();
            else closeIt();
          },
          tap: openIt,
        },
        { axis: 'y', threshold: 6 }
      );

    // Fechar arrastando para cima dentro do painel.
    track(
      el,
      {
        begin: () => {
          el.style.transition = 'none';
        },
        move: (g) => {
          const h = phone.clientHeight || 1;
          const p = clamp(-g.dy / h, 0, 1);
          el.style.transform = 'translate3d(0,' + -p * 100 + '%,0)';
        },
        end: (g) => {
          el.style.transition = '';
          const h = phone.clientHeight || 1;
          if (-g.dy - project(g.vy) > h * 0.14) closeIt();
          else openIt();
        },
      },
      { axis: 'y', threshold: 10, filter: (ev) => !ev.target.closest('a, .cc-slider, .nc-inner') }
    );

    return { open: openIt, close: closeIt };
  }

  const ccHot = document.createElement('div');
  ccHot.className = 'cc-hotspot';
  ccHot.setAttribute('aria-hidden', 'true');
  phone.appendChild(ccHot);

  const ncHot = document.createElement('div');
  ncHot.className = 'nc-hotspot';
  ncHot.setAttribute('aria-hidden', 'true');
  phone.appendChild(ncHot);

  const ccPanel = panel(cc, ccHot, () => syncCC());
  const ncPanel = panel(nc, ncHot, null);
  if (nc) {
    const ncClose = nc.querySelector('[data-nc-close]');
    if (ncClose) ncClose.addEventListener('click', () => ncPanel.close());
  }
  const openCC = () => ccPanel.open();
  const closeCC = () => ccPanel.close();
  const closeNC = () => ncPanel.close();

  // ── Central de Controlo ─────────────────────────────────────
  function syncCC() {
    if (!cc) return;
    const dark = effectiveTheme() === 'dark';
    const themeTile = cc.querySelector('[data-cc="theme"]');
    if (themeTile) {
      themeTile.setAttribute('aria-pressed', dark ? 'true' : 'false');
      const v = themeTile.querySelector('[data-cc-theme]');
      if (v) v.textContent = dark ? s.control.dark : s.control.light;
    }
    const wall = cc.querySelector('[data-cc-wall]');
    if (wall) wall.textContent = (s.wallpaperNames && s.wallpaperNames[prefs.wallpaper]) || prefs.wallpaper;
    const fill = cc.querySelector('.cc-slider .fill');
    if (fill) fill.style.height = prefs.brightness + '%';
  }

  if (cc)
    cc.addEventListener('click', (ev) => {
      const t = ev.target.closest('[data-cc]');
      if (!t) return;
      const kind = t.dataset.cc;
      if (kind === 'close') closeCC();
      else if (kind === 'theme') {
        setPref('theme', effectiveTheme() === 'dark' ? 'light' : 'dark');
        ctx.syncSettings();
        syncCC();
      } else if (kind === 'wallpaper') {
        const walls = ['aurora', 'sonoma', 'night', 'graphite'];
        setPref('wallpaper', walls[(walls.indexOf(prefs.wallpaper) + 1) % walls.length]);
        ctx.syncSettings();
        syncCC();
      } else if (kind === 'lang') location.href = ctx.data.altHome;
      else if (kind === 'settings') {
        closeCC();
        ctx.run('open:definicoes');
      }
    });

  const slider = cc ? cc.querySelector('.cc-slider') : null;
  if (slider) {
    const setFrom = (y) => {
      const r = slider.getBoundingClientRect();
      const p = Math.round(clamp(((r.bottom - y) / r.height) * 100, 25, 100));
      setPref('brightness', p);
      slider.setAttribute('aria-valuenow', String(p));
      syncCC();
    };
    track(
      slider,
      {
        down: (g) => setFrom(g.y0),
        move: (g) => setFrom(g.y),
      },
      { threshold: 0 }
    );
    slider.addEventListener('keydown', (ev) => {
      const step = ev.key === 'ArrowUp' ? 5 : ev.key === 'ArrowDown' ? -5 : 0;
      if (!step) return;
      setPref('brightness', clamp(prefs.brightness + step, 25, 100));
      syncCC();
      ev.preventDefault();
    });
  }

  // ── Comutador de aplicações ─────────────────────────────────
  function openSwitcher() {
    if (!stack.length) return;
    const rail = switcher.querySelector('.switcher-rail');
    rail.innerHTML = stack
      .slice()
      .reverse()
      .map((id) => {
        const app = meta(id);
        return (
          '<article class="switcher-card" data-card="' + esc(id) + '">' +
          '<header class="card-head"><svg viewBox="0 0 100 100" aria-hidden="true"><use href="#icon-' + esc(id) + '"/></svg>' +
          '<strong>' + esc(app.name) + '</strong></header>' +
          '<div class="card-body">' + esc(app.subtitle) + '</div></article>'
        );
      })
      .join('');
    switcher.classList.add('open');

    rail.querySelectorAll('.switcher-card').forEach((card) => {
      track(
        card,
        {
          begin: () => {
            card.style.transition = 'none';
            card.style.willChange = 'transform, opacity';
          },
          move: (g) => {
            const up = Math.min(0, g.dy);
            // Elástico ao empurrar para baixo, para não parecer partido.
            const down = g.dy > 0 ? rubber(g.dy, 90) : 0;
            card.style.transform = 'translate3d(0,' + (up + down) + 'px,0) scale(' + (1 - Math.min(0.06, -up / 2400)) + ')';
            card.style.opacity = String(clamp(1 + up / 520, 0.25, 1));
          },
          end: (g) => {
            card.style.willChange = '';
            const reach = -g.dy + project(-g.vy);
            if (reach > 110) {
              const id = card.dataset.card;
              card.style.transition = 'transform .24s ' + EASE + ', opacity .2s linear';
              card.style.transform = 'translate3d(0,-130%,0) scale(.9)';
              card.style.opacity = '0';
              setTimeout(() => {
                close(id);
                card.remove();
                if (!stack.length) closeSwitcher();
              }, 230);
              return;
            }
            card.style.transition = 'transform .26s ' + EASE + ', opacity .2s linear';
            card.style.transform = '';
            card.style.opacity = '';
            setTimeout(() => (card.style.transition = ''), 280);
          },
        },
        { axis: 'y', threshold: 10 }
      );
    });
  }

  const closeSwitcher = () => switcher.classList.remove('open');

  switcher.addEventListener('click', (ev) => {
    const card = ev.target.closest('[data-card]');
    if (card) {
      closeSwitcher();
      open(card.dataset.card, card);
    } else if (ev.target === switcher) {
      closeSwitcher();
    }
  });

  // ── Gesto: voltar atrás pela margem esquerda ────────────────
  // Sem elemento por cima do conteúdo: filtra-se pela posição do dedo,
  // como no iOS, para não roubar toques aos botões encostados à esquerda.
  let backPane = null;
  track(
    phone,
    {
      begin: () => {
        backPane = ctx.escritos && ctx.escritos.hasDetail() ? ctx.escritos.pane() : null;
        if (backPane) backPane.classList.add('dragging');
      },
      move: (g) => {
        if (!backPane) return;
        const w = phone.clientWidth || 1;
        backPane.style.transform = 'translate3d(' + clamp(g.dx, 0, w) + 'px,0,0)';
      },
      end: (g) => {
        if (!backPane) return;
        const pane = backPane;
        backPane = null;
        pane.classList.remove('dragging');
        const w = phone.clientWidth || 1;
        if (g.dx + project(g.vx) > w * 0.35) {
          // Deixa a folha onde está: o CSS leva-a o resto do caminho.
          ctx.run('back');
          setTimeout(() => (pane.style.transform = ''), 20);
        } else {
          pane.style.transform = '';
        }
      },
    },
    {
      axis: 'x',
      threshold: 12,
      filter: (ev) =>
        current === 'escritos' &&
        !!ctx.escritos &&
        ctx.escritos.hasDetail() &&
        // Fora a barra inferior e os painéis: dois gestos a agarrar o
        // mesmo dedo é um gesto que não funciona.
        !ev.target.closest('.homebar, .cc, .nc, .switcher, .lock') &&
        ev.clientX - phone.getBoundingClientRect().left < 28,
    }
  );

  // ── Ecrã bloqueado ──────────────────────────────────────────
  function showLock() {
    lock.hidden = false;
    lock.classList.remove('gone');
    lock.style.transform = '';
  }
  function unlock() {
    if (lock.hidden) return;
    lock.style.transition = '';
    lock.classList.add('gone');
    setTimeout(() => {
      lock.hidden = true;
      lock.style.transform = '';
      notify(s.welcome + ', ' + ctx.data.site.name.split(' ')[0]);
    }, 520);
  }
  track(
    lock,
    {
      begin: () => (lock.style.transition = 'none'),
      move: (g) => {
        const h = phone.clientHeight || 1;
        const up = Math.min(0, g.dy);
        lock.style.transform = 'translate3d(0,' + up + 'px,0)';
        lock.style.opacity = String(clamp(1 + g.dy / (h * 0.7), 0.15, 1));
      },
      end: (g) => {
        lock.style.transition = '';
        lock.style.opacity = '';
        if (-g.dy - project(g.vy) > 70) unlock();
        else lock.style.transform = '';
      },
      tap: (g, ev) => {
        if (!ev || !ev.target.closest('button')) unlock();
      },
    },
    { axis: 'y', threshold: 8, filter: (ev) => !ev.target.closest('.lock-note, .lock-action') }
  );

  const unlockBtn = lock.querySelector('[data-unlock]');
  if (unlockBtn) unlockBtn.addEventListener('click', unlock);

  return {
    open,
    close,
    home,
    teardown,
    notify,
    openCC,
    closeCC,
    syncCC,
    showLock,
    unlock,
    openSwitcher,
    goToPage,
    current: () => current,
    has: (id) => views.has(id),
  };
}
