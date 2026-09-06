// O telefone: ecrã inicial, abertura de aplicações ancorada no ícone,
// gestos da barra inferior, Central de Controlo, comutador e bloqueio.
import { reducedMotion, effectiveTheme, setPref, prefs } from './state.js';

const EASE = 'cubic-bezier(.32,.72,0,1)';
const esc = (s) =>
  String(s).replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]);

export function createPhone(ctx) {
  const phone = document.getElementById('phone');
  const sb = document.getElementById('springboard');
  const layer = document.getElementById('iosViews');
  const cc = document.getElementById('cc');
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

  // ── Ilha dinâmica: avisos curtos ────────────────────────────
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
      '<button class="lead-btn" type="button" data-view-back hidden>' +
      '<svg viewBox="0 0 100 100" width="12" height="12" aria-hidden="true"><use href="#ui-chevron"/></svg>' +
      esc(s.back) +
      '</button>' +
      `<h2>${esc(app.name)}</h2>` +
      `<button class="trail-btn" type="button" data-view-done>${esc(s.done)}</button>` +
      '</header>' +
      '<div class="ios-view-body"></div>';
    view.querySelector('.ios-view-body').appendChild(ctx.contentEl(id));
    view.querySelector('[data-view-done]').addEventListener('click', () => home());
    view.querySelector('[data-view-back]').addEventListener('click', () => ctx.run('back'));
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
    sb.classList.add('pushed');
    layer.style.pointerEvents = 'auto';
    ctx.active = id;

    const source = fromEl || document.querySelector(`.sb-app[data-open="${id}"]`);
    if (!reducedMotion() && source && source.getBoundingClientRect) {
      const r = source.getBoundingClientRect();
      const pr = phone.getBoundingClientRect();
      if (r.width > 0) {
        const scale = Math.max(0.05, r.width / pr.width);
        view.animate(
          [
            {
              transformOrigin: '0 0',
              transform: `translate(${r.left - pr.left}px, ${r.top - pr.top}px) scale(${scale})`,
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

  function home() {
    if (!current) return;
    const view = views.get(current);
    const id = current;
    current = null;
    ctx.active = null;
    sb.classList.remove('pushed');
    layer.style.pointerEvents = 'none';
    const finish = () => {
      view.classList.remove('open');
      view.style.transform = '';
      view.style.borderRadius = '';
      view.style.opacity = '';
    };
    const source = document.querySelector(`.sb-app[data-open="${id}"]`);
    if (!reducedMotion() && source) {
      const r = source.getBoundingClientRect();
      const pr = phone.getBoundingClientRect();
      const scale = Math.max(0.05, r.width / pr.width);
      const anim = view.animate(
        [
          { transformOrigin: '0 0', transform: 'none', borderRadius: '0px', opacity: 1 },
          {
            transformOrigin: '0 0',
            transform: `translate(${r.left - pr.left}px, ${r.top - pr.top}px) scale(${scale})`,
            borderRadius: '26px',
            opacity: 0.2,
          },
        ],
        { duration: 380, easing: EASE }
      );
      anim.onfinish = finish;
      anim.oncancel = finish;
    } else {
      finish();
    }
  }

  function close(id) {
    const view = views.get(id);
    if (!view) return;
    const wasCurrent = current === id;
    if (wasCurrent) home();
    setTimeout(() => {
      ctx.releaseContent(id);
      view.remove();
      views.delete(id);
      const at = stack.indexOf(id);
      if (at >= 0) stack.splice(at, 1);
    }, wasCurrent ? 420 : 0);
  }

  function teardown() {
    [...views.keys()].forEach((id) => {
      ctx.releaseContent(id);
      views.get(id).remove();
      views.delete(id);
    });
    stack.length = 0;
    current = null;
    sb.classList.remove('pushed');
    closeSwitcher();
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
          `<article class="switcher-card" data-card="${esc(id)}">` +
          `<header class="card-head"><svg viewBox="0 0 100 100" aria-hidden="true"><use href="#icon-${esc(id)}"/></svg>` +
          `<strong>${esc(app.name)}</strong>` +
          `<button class="btn" type="button" data-card-close="${esc(id)}" style="margin-left:auto;padding:4px 10px">×</button></header>` +
          `<div class="card-body">${esc(app.subtitle)}</div></article>`
        );
      })
      .join('');
    switcher.classList.add('open');
  }
  const closeSwitcher = () => switcher.classList.remove('open');

  switcher.addEventListener('click', (ev) => {
    const kill = ev.target.closest('[data-card-close]');
    if (kill) {
      close(kill.dataset.cardClose);
      if (!stack.length) closeSwitcher();
      else openSwitcher();
      return;
    }
    const card = ev.target.closest('[data-card]');
    closeSwitcher();
    if (card) open(card.dataset.card, card);
  });

  // ── Barra inferior: tocar, arrastar, segurar ────────────────
  let drag = null;
  homebar.addEventListener('pointerdown', (ev) => {
    homebar.setPointerCapture(ev.pointerId);
    homebar.classList.add('active');
    drag = { y: ev.clientY, t: Date.now(), last: ev.clientY, lastT: Date.now(), moved: 0 };
  });
  homebar.addEventListener('pointermove', (ev) => {
    if (!drag) return;
    drag.moved = Math.max(drag.moved, drag.y - ev.clientY);
    drag.last = ev.clientY;
    drag.lastT = Date.now();
    const view = current ? views.get(current) : null;
    if (view) {
      const p = Math.max(0, Math.min(1, (drag.y - ev.clientY) / 220));
      view.style.transform = `scale(${1 - p * 0.18})`;
      view.style.borderRadius = 18 * p + 'px';
    }
  });
  const endDrag = (ev) => {
    if (!drag) return;
    homebar.classList.remove('active');
    const view = current ? views.get(current) : null;
    if (view) {
      view.style.transform = '';
      view.style.borderRadius = '';
    }
    const dy = drag.y - (ev ? ev.clientY : drag.last);
    const slow = Date.now() - drag.lastT > 110 || Math.abs(drag.last - (ev ? ev.clientY : drag.last)) < 2;
    const held = Date.now() - drag.t > 320;
    drag = null;
    if (dy > 60) {
      if (stack.length > 1 && (slow || held) && dy > 110) {
        home();
        setTimeout(openSwitcher, 320);
      } else {
        home();
      }
    } else if (dy < 10 && current) {
      home();
    }
  };
  homebar.addEventListener('pointerup', endDrag);
  homebar.addEventListener('pointercancel', () => endDrag(null));

  // ── Central de Controlo ─────────────────────────────────────
  const hotspot = document.createElement('div');
  hotspot.className = 'cc-hotspot';
  hotspot.setAttribute('aria-hidden', 'true');
  phone.appendChild(hotspot);

  let ccDrag = null;
  hotspot.addEventListener('pointerdown', (ev) => {
    hotspot.setPointerCapture(ev.pointerId);
    ccDrag = ev.clientY;
  });
  hotspot.addEventListener('pointerup', (ev) => {
    if (ccDrag === null) return;
    if (ev.clientY - ccDrag > 24 || Math.abs(ev.clientY - ccDrag) < 6) openCC();
    ccDrag = null;
  });

  function openCC() {
    cc.classList.add('open');
    syncCC();
  }
  const closeCC = () => cc.classList.remove('open');

  function syncCC() {
    const dark = effectiveTheme() === 'dark';
    const themeTile = cc.querySelector('[data-cc="theme"]');
    if (themeTile) {
      themeTile.setAttribute('aria-pressed', dark ? 'true' : 'false');
      const v = themeTile.querySelector('[data-cc-theme]');
      if (v) v.textContent = dark ? s.control.dark : s.control.light;
    }
    const wall = cc.querySelector('[data-cc-wall]');
    if (wall) wall.textContent = prefs.wallpaper;
    const fill = cc.querySelector('.cc-slider .fill');
    if (fill) fill.style.height = prefs.brightness + '%';
  }

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
    } else if (kind === 'lang') {
      location.href = ctx.data.altHome;
    } else if (kind === 'settings') {
      closeCC();
      ctx.run('open:definicoes');
    }
  });

  const slider = cc.querySelector('.cc-slider');
  if (slider) {
    const setFrom = (ev) => {
      const r = slider.getBoundingClientRect();
      const p = Math.round(Math.max(30, Math.min(100, ((r.bottom - ev.clientY) / r.height) * 100)));
      setPref('brightness', p);
      slider.setAttribute('aria-valuenow', String(p));
      syncCC();
    };
    slider.addEventListener('pointerdown', (ev) => {
      slider.setPointerCapture(ev.pointerId);
      slider.dataset.dragging = '1';
      setFrom(ev);
    });
    slider.addEventListener('pointermove', (ev) => {
      if (slider.dataset.dragging) setFrom(ev);
    });
    const stop = () => delete slider.dataset.dragging;
    slider.addEventListener('pointerup', stop);
    slider.addEventListener('pointercancel', stop);
  }

  // ── Ecrã bloqueado ──────────────────────────────────────────
  function showLock() {
    lock.hidden = false;
    lock.classList.remove('gone');
  }
  function unlock() {
    if (lock.hidden) return;
    lock.classList.add('gone');
    setTimeout(() => {
      lock.hidden = true;
      notify(s.welcome + ', ' + ctx.data.site.name.split(' ')[0]);
    }, 520);
  }
  let lockStart = null;
  lock.addEventListener('pointerdown', (ev) => {
    lockStart = ev.clientY;
  });
  lock.addEventListener('pointerup', (ev) => {
    if (lockStart === null) return;
    if (lockStart - ev.clientY > 40 || Math.abs(lockStart - ev.clientY) < 8) unlock();
    lockStart = null;
  });

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
    current: () => current,
    has: (id) => views.has(id),
  };
}
