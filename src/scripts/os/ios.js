// O telefone. Ecrã inicial com páginas, aplicações que abrem a partir
// do próprio ícone, e gestos que seguem o dedo em tempo real: subir
// para o início, segurar para o comutador, puxar de cima para a Central
// de Controlo ou para as notificações, arrastar da margem para voltar
// atrás, e deslizar para desbloquear.
import { reducedMotion, effectiveTheme, setPref, prefs } from './state.js';
import { track, rubber, clamp } from './gesture.js';

const EASE = 'cubic-bezier(.32,.72,0,1)';
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
      '<header class="ios-view-head">' +
      '<span class="lead-btn"></span>' +
      '<h2>' + esc(app.name) + '</h2>' +
      '<button class="trail-btn" type="button" data-view-done>' + esc(s.done) + '</button>' +
      '</header>' +
      '<div class="ios-view-body"></div>';
    view.querySelector('.ios-view-body').appendChild(ctx.contentEl(id));
    view.querySelector('[data-view-done]').addEventListener('click', () => home());
    layer.appendChild(view);
    views.set(id, view);
    return view;
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
    pushSpringboard(true);
    layer.style.pointerEvents = 'auto';
    ctx.active = id;
    closeCC();
    closeNC();

    const source = fromEl && fromEl.getBoundingClientRect ? fromEl : iconFor(id);
    if (!reducedMotion() && source) {
      const r = source.getBoundingClientRect();
      const pr = phone.getBoundingClientRect();
      if (r.width > 0 && pr.width > 0) {
        const scale = Math.max(0.05, r.width / pr.width);
        view.animate(
          [
            {
              transformOrigin: '0 0',
              transform: 'translate(' + (r.left - pr.left) + 'px,' + (r.top - pr.top) + 'px) scale(' + scale + ')',
              borderRadius: '26px',
              opacity: 0.35,
            },
            { transformOrigin: '0 0', transform: 'none', borderRadius: '0px', opacity: 1 },
          ],
          { duration: 460, easing: EASE }
        );
      }
    }
    return view;
  }

  function pushSpringboard(on) {
    sb.style.transform = '';
    sb.style.opacity = '';
    sb.style.filter = '';
    sb.classList.toggle('pushed', on);
  }

  function home() {
    if (!current) return Promise.resolve();
    const view = views.get(current);
    const id = current;
    current = null;
    ctx.active = null;
    pushSpringboard(false);
    layer.style.pointerEvents = 'none';

    const clear = () => {
      view.classList.remove('open');
      view.style.transform = '';
      view.style.borderRadius = '';
      view.style.opacity = '';
    };
    const source = iconFor(id);
    if (reducedMotion() || !source) {
      clear();
      return Promise.resolve();
    }
    const r = source.getBoundingClientRect();
    const pr = phone.getBoundingClientRect();
    const scale = Math.max(0.05, r.width / pr.width);
    const from = view.style.transform || 'none';
    const anim = view.animate(
      [
        { transformOrigin: '0 0', transform: from === 'none' ? 'none' : from, opacity: 1 },
        {
          transformOrigin: '0 0',
          transform: 'translate(' + (r.left - pr.left) + 'px,' + (r.top - pr.top) + 'px) scale(' + scale + ')',
          borderRadius: '26px',
          opacity: 0.2,
        },
      ],
      { duration: 360, easing: EASE }
    );
    return anim.finished.then(clear, clear);
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

  // ── Gesto: barra inferior ───────────────────────────────────
  // Subir devolve ao início; subir e segurar abre o comutador.
  let homeDrag = null;
  track(
    homebar,
    {
      begin: () => {
        const view = current ? views.get(current) : null;
        homeDrag = { view, peak: 0 };
        if (view) view.style.transition = 'none';
      },
      move: (g) => {
        if (!homeDrag) return;
        const h = phone.clientHeight || 1;
        const up = Math.max(0, -g.dy);
        const p = clamp(up / (h * 0.45), 0, 1);
        homeDrag.peak = Math.max(homeDrag.peak, p);
        if (homeDrag.view) {
          const scale = 1 - p * 0.32;
          homeDrag.view.style.transformOrigin = '50% 50%';
          homeDrag.view.style.transform =
            'translateY(' + -up * 0.22 + 'px) scale(' + scale + ')';
          homeDrag.view.style.borderRadius = 34 * p + 'px';
        } else {
          // Sem app aberta, o ecrã inicial faz o elástico.
          sb.style.transform = 'translateY(' + rubber(g.dy, 120) + 'px)';
        }
      },
      end: (g) => {
        sb.style.transform = '';
        const view = homeDrag && homeDrag.view;
        if (view) view.style.transition = '';
        const up = -g.dy;
        const fast = g.vy < -0.45;
        const paused = Math.abs(g.vy) < 0.12;
        const wantSwitcher = stack.length > 1 && up > 110 && paused;
        homeDrag = null;
        if (!current) return;
        if (wantSwitcher) {
          home().then(openSwitcher);
        } else if (up > 80 || fast) {
          home();
        } else if (view) {
          view.animate(
            [{ transform: view.style.transform, borderRadius: view.style.borderRadius }, { transform: 'none', borderRadius: '0px' }],
            { duration: 260, easing: EASE }
          ).finished.then(
            () => {
              view.style.transform = '';
              view.style.borderRadius = '';
            },
            () => {}
          );
        }
      },
      tap: () => {
        if (current) home();
      },
    },
    { threshold: 4 }
  );

  // ── Gesto: páginas do ecrã inicial ──────────────────────────
  let page = 0;
  const pageCount = pages ? pages.children.length : 1;

  function goToPage(n, animate) {
    page = clamp(n, 0, pageCount - 1);
    if (!pages) return;
    pages.style.transition = animate === false ? 'none' : 'transform .42s ' + EASE;
    pages.style.transform = 'translateX(' + -page * 100 + '%)';
    if (dots) [...dots.children].forEach((d, i) => d.classList.toggle('on', i === page));
  }

  if (pages && pageCount > 1) {
    track(
      pages,
      {
        begin: () => {
          pages.style.transition = 'none';
        },
        move: (g) => {
          const w = pages.clientWidth || 1;
          let dx = g.dx;
          if ((page === 0 && dx > 0) || (page === pageCount - 1 && dx < 0)) dx = rubber(dx, w * 0.4);
          pages.style.transform = 'translateX(calc(' + -page * 100 + '% + ' + dx + 'px))';
        },
        end: (g) => {
          const w = pages.clientWidth || 1;
          const far = Math.abs(g.dx) > w * 0.22;
          const fast = Math.abs(g.vx) > 0.35;
          if ((far || fast) && g.dx < 0) goToPage(page + 1);
          else if ((far || fast) && g.dx > 0) goToPage(page - 1);
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
            if (onOpen) onOpen();
          },
          move: (g) => {
            const h = phone.clientHeight || 1;
            const p = clamp(g.dy / h, 0, 1);
            el.style.transform = 'translateY(' + (p - 1) * 100 + '%)';
          },
          end: (g) => {
            el.classList.remove('dragging');
            el.style.transition = '';
            const h = phone.clientHeight || 1;
            if (g.dy > h * 0.18 || g.vy > 0.4) openIt();
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
          el.style.transform = 'translateY(' + -p * 100 + '%)';
        },
        end: (g) => {
          el.style.transition = '';
          const h = phone.clientHeight || 1;
          if (-g.dy > h * 0.16 || g.vy < -0.4) closeIt();
          else openIt();
        },
      },
      { axis: 'y', threshold: 10, filter: (ev) => !ev.target.closest('button, a, .cc-slider') }
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
          begin: () => (card.style.transition = 'none'),
          move: (g) => {
            card.style.transform = 'translateY(' + Math.min(0, g.dy) + 'px)';
            card.style.opacity = String(clamp(1 + g.dy / 400, 0.2, 1));
          },
          end: (g) => {
            card.style.transition = '';
            if (-g.dy > 90 || g.vy < -0.5) {
              card.style.transform = 'translateY(-120%)';
              card.style.opacity = '0';
              const id = card.dataset.card;
              setTimeout(() => {
                close(id);
                card.remove();
                if (!stack.length) closeSwitcher();
              }, 220);
            } else {
              card.style.transform = '';
              card.style.opacity = '';
            }
          },
        },
        { axis: 'y', threshold: 12 }
      );
    });
  }
  const closeSwitcher = () => switcher.classList.remove('open');

  switcher.addEventListener('click', (ev) => {
    const card = ev.target.closest('[data-card]');
    if (card) {
      closeSwitcher();
      open(card.dataset.card, card.querySelector('svg'));
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
        backPane.style.transform = 'translateX(' + clamp(g.dx, 0, w) + 'px)';
      },
      end: (g) => {
        if (!backPane) return;
        const pane = backPane;
        backPane = null;
        pane.classList.remove('dragging');
        pane.style.transform = '';
        const w = phone.clientWidth || 1;
        if (g.dx > w * 0.32 || g.vx > 0.4) ctx.run('back');
      },
    },
    {
      axis: 'x',
      threshold: 12,
      filter: (ev) =>
        current === 'escritos' &&
        !!ctx.escritos &&
        ctx.escritos.hasDetail() &&
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
        lock.style.transform = 'translateY(' + Math.min(0, g.dy) + 'px)';
        lock.style.opacity = String(clamp(1 + g.dy / 500, 0.25, 1));
      },
      end: (g) => {
        lock.style.transition = '';
        lock.style.opacity = '';
        if (-g.dy > 70 || g.vy < -0.45) unlock();
        else lock.style.transform = '';
      },
      tap: (g, ev) => {
        if (!ev || !ev.target.closest('button')) unlock();
      },
    },
    { axis: 'y', threshold: 8, filter: (ev) => !ev.target.closest('.lock-note') }
  );

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
