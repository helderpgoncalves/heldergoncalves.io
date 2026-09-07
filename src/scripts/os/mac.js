// O Mac: barra de menus, Dock com ampliação, janelas que se arrastam
// e redimensionam, pesquisa (⌘K) e menu do botão direito.
import { prefs, setPref, effectiveTheme, reducedMotion } from './state.js';

const DIRS = ['n', 's', 'e', 'w', 'ne', 'nw', 'se', 'sw'];
const esc = (s) =>
  String(s).replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]);

export function createMac(ctx) {
  const root = document.getElementById('mac');
  const layer = document.getElementById('windows');
  const dock = document.getElementById('dock');
  const menubar = document.getElementById('menubar');
  const menuApp = document.getElementById('menuApp');
  const spotlight = document.getElementById('spotlight');
  const spotInput = document.getElementById('spotInput');
  const spotResults = document.getElementById('spotResults');
  const s = ctx.data.strings;

  const wins = new Map();
  let zTop = 20;
  let openMenu = null;
  let ctxMenu = null;
  let spotItems = [];
  let spotIndex = 0;

  const area = () => {
    const r = layer.getBoundingClientRect();
    return { w: r.width, h: r.height };
  };
  const meta = (id) => ctx.data.apps.find((a) => a.id === id);

  // ── Janelas ─────────────────────────────────────────────────
  // O degrau da escada. No macOS cada janela nova nasce um degrau
  // abaixo e à direita da anterior — é por isso que se vêem as barras
  // de título das que ficaram atrás. Quando a escada chega ao fundo,
  // recomeça em cima.
  const STEP = 24;
  let cascade = 0;

  // Tamanho: o que a aplicação pede, mas nunca tanto que tape o ecrã
  // inteiro. Uma janela que ocupa tudo não é uma janela, é um modo de
  // ecrã inteiro — e deixa de haver o que sobrepor.
  function cap(want, min, avail, share) {
    const max = Math.max(min, Math.min(avail - 32, Math.round(avail * share)));
    return Math.max(Math.min(want, max), Math.min(min, avail - 24));
  }

  function place(w, h) {
    const { w: W, h: H } = area();
    const baseX = Math.max(12, Math.min(W - w - 12, Math.round((W - w) / 2) - 60));
    const baseY = 22;
    const steps = Math.max(
      1,
      Math.floor(Math.min(W - w - baseX - 16, H - h - baseY - 72) / STEP)
    );
    const i = cascade % steps;
    cascade += 1;
    return {
      x: Math.max(12, Math.min(W - w - 12, baseX + i * STEP)),
      y: Math.max(8, Math.min(H - h - 56, baseY + i * STEP)),
    };
  }

  // De onde a janela vem e para onde vai. O macOS não faz as janelas
  // aparecerem do nada: elas crescem a partir do ícone em que se
  // carregou, e encolhem de volta para a Dock quando se minimizam.
  function anchor(win, el, prefix) {
    if (!el) return false;
    const a = el.getBoundingClientRect();
    const b = win.getBoundingClientRect();
    if (!a.width || !b.width) return false;
    win.style.setProperty('--' + prefix + '-x', Math.round(a.left + a.width / 2 - (b.left + b.width / 2)) + 'px');
    win.style.setProperty('--' + prefix + '-y', Math.round(a.top + a.height / 2 - (b.top + b.height / 2)) + 'px');
    win.style.setProperty('--' + prefix + '-s', Math.max(0.05, a.width / b.width).toFixed(3));
    return true;
  }

  const dockIcon = (id) => dock.querySelector(`[data-open="${id}"] svg`);

  function open(id, from) {
    const existing = wins.get(id);
    if (existing) {
      if (existing.classList.contains('minimized')) {
        existing.classList.remove('minimized');
        if (!reducedMotion()) {
          anchor(existing, from || dockIcon(id), 'from');
          existing.classList.add('opening');
          setTimeout(() => existing.classList.remove('opening'), 300);
        }
      }
      focus(id);
      return existing;
    }
    const app = meta(id);
    if (!app) return null;
    const { w: W, h: H } = area();
    const w = cap(app.win.w, app.win.minW, W, 0.74);
    const h = cap(app.win.h, app.win.minH, H, 0.78);
    const { x, y } = place(w, h);

    const win = document.createElement('section');
    win.className = 'win glass';
    win.dataset.app = id;
    win.style.setProperty('--x', x + 'px');
    win.style.setProperty('--y', y + 'px');
    win.style.setProperty('--w', w + 'px');
    win.style.setProperty('--h', h + 'px');
    win.innerHTML =
      '<header class="win-bar">' +
      '<span class="lights">' +
      `<button class="light light-close" type="button" aria-label="${esc(s.close)}"></button>` +
      `<button class="light light-min" type="button" aria-label="${esc(s.minimize)}"></button>` +
      `<button class="light light-zoom" type="button" aria-label="${esc(s.zoom)}"></button>` +
      '</span>' +
      `<span class="win-title">${esc(app.window)}</span>` +
      '</header>' +
      '<div class="win-body"></div>' +
      DIRS.map((d) => `<span class="grip grip-${d}" data-dir="${d}"></span>`).join('');

    win.querySelector('.win-body').appendChild(ctx.contentEl(id));
    layer.appendChild(win);
    if (ctx.addGlass) ctx.addGlass(win);
    wins.set(id, win);
    wireWindow(win, id);
    focus(id);
    bounce(id);
    if (!reducedMotion()) {
      anchor(win, from || dockIcon(id), 'from');
      win.classList.add('opening');
      setTimeout(() => win.classList.remove('opening'), 300);
    }
    return win;
  }

  function close(id) {
    const win = wins.get(id);
    if (!win) return;
    wins.delete(id);
    win.classList.add('closing');
    const done = () => {
      ctx.releaseContent(id);
      win.remove();
      ctx.setOpen(id, false);
      const next = topmost();
      if (next) focus(next);
      else {
        setActiveLabel(null);
        // Sem janelas abertas, a escada recomeça do primeiro degrau.
        cascade = 0;
      }
      syncDock();
    };
    if (reducedMotion()) done();
    else setTimeout(done, 150);
  }

  function focus(id) {
    const win = wins.get(id);
    if (!win) return;
    wins.forEach((w) => w.classList.remove('focused'));
    win.classList.add('focused');
    win.style.zIndex = String(++zTop);
    ctx.setOpen(id, true);
    setActiveLabel(id);
    syncDock();
  }

  function setActiveLabel(id) {
    const app = id ? meta(id) : null;
    menuApp.textContent = app ? app.name : 'Finder';
    ctx.active = id;
  }

  const activeWin = () => (ctx.active ? wins.get(ctx.active) : null);

  // Qual é a janela que está mesmo à frente de todas as outras.
  function topmost(skip) {
    let best = null;
    let z = -1;
    wins.forEach((win, key) => {
      if (key === skip || win.classList.contains('minimized')) return;
      const n = parseInt(win.style.zIndex, 10) || 0;
      if (n >= z) {
        z = n;
        best = key;
      }
    });
    return best;
  }

  function minimize(id) {
    const key = id || ctx.active;
    const win = wins.get(key);
    if (!win || win.classList.contains('minimized')) return;
    const after = () => {
      win.classList.remove('minimizing');
      win.classList.add('minimized');
      const next = topmost(key);
      if (next) focus(next);
      else setActiveLabel(null);
    };
    if (reducedMotion() || !anchor(win, dockIcon(key), 'to')) {
      after();
      return;
    }
    win.classList.add('minimizing');
    setTimeout(after, 280);
  }

  function zoom(id) {
    const win = wins.get(id || ctx.active);
    if (!win) return;
    const { w: W, h: H } = area();
    if (win.classList.contains('zoomed')) {
      win.classList.remove('zoomed');
      const r = win.dataset.rect ? JSON.parse(win.dataset.rect) : null;
      if (r) {
        win.style.setProperty('--x', r.x + 'px');
        win.style.setProperty('--y', r.y + 'px');
        win.style.setProperty('--w', r.w + 'px');
        win.style.setProperty('--h', r.h + 'px');
      }
      return;
    }
    win.dataset.rect = JSON.stringify({
      x: parseFloat(win.style.getPropertyValue('--x')),
      y: parseFloat(win.style.getPropertyValue('--y')),
      w: parseFloat(win.style.getPropertyValue('--w')),
      h: parseFloat(win.style.getPropertyValue('--h')),
    });
    win.classList.add('zoomed');
    win.style.setProperty('--x', '0px');
    win.style.setProperty('--y', '0px');
    win.style.setProperty('--w', W + 'px');
    win.style.setProperty('--h', H + 'px');
  }

  function tile() {
    const list = [...wins.values()].filter((w) => !w.classList.contains('minimized'));
    if (!list.length) return;
    const { w: W, h: H } = area();
    const cols = Math.ceil(Math.sqrt(list.length));
    const rows = Math.ceil(list.length / cols);
    const cw = (W - 16 * (cols + 1)) / cols;
    const ch = (H - 80 - 16 * (rows + 1)) / rows;
    list.forEach((win, i) => {
      const cx = i % cols;
      const cy = Math.floor(i / cols);
      win.classList.remove('zoomed');
      win.style.setProperty('--x', 16 + cx * (cw + 16) + 'px');
      win.style.setProperty('--y', 16 + cy * (ch + 16) + 'px');
      win.style.setProperty('--w', cw + 'px');
      win.style.setProperty('--h', ch + 'px');
    });
  }

  function closeAll() {
    [...wins.keys()].forEach(close);
  }

  function wireWindow(win, id) {
    win.addEventListener('pointerdown', () => focus(id), true);
    // Borda de rolagem: a barra de título separa-se do conteúdo assim
    // que há alguma coisa a passar por baixo dela.
    win.addEventListener(
      'scroll',
      (ev) => {
        const top = ev.target && ev.target.scrollTop;
        win.classList.toggle('scrolled', typeof top === 'number' && top > 2);
      },
      true
    );
    win.querySelector('.light-close').addEventListener('click', () => close(id));
    win.querySelector('.light-min').addEventListener('click', () => minimize(id));
    win.querySelector('.light-zoom').addEventListener('click', () => zoom(id));

    const bar = win.querySelector('.win-bar');
    bar.addEventListener('dblclick', () => zoom(id));
    bar.addEventListener('pointerdown', (ev) => {
      if (ev.target.closest('.light') || ev.button !== 0) return;
      if (win.classList.contains('zoomed')) return;
      const startX = ev.clientX;
      const startY = ev.clientY;
      const ox = parseFloat(win.style.getPropertyValue('--x'));
      const oy = parseFloat(win.style.getPropertyValue('--y'));
      const { w: W, h: H } = area();
      const ww = win.offsetWidth;
      let zone = null;
      bar.setPointerCapture(ev.pointerId);
      const move = (e) => {
        const x = Math.max(-ww + 90, Math.min(W - 90, ox + e.clientX - startX));
        const y = Math.max(0, Math.min(H - 44, oy + e.clientY - startY));
        win.style.setProperty('--x', x + 'px');
        win.style.setProperty('--y', y + 'px');
        // Encaixe: junto às margens, o Mac mostra para onde a janela vai.
        const r = layer.getBoundingClientRect();
        const px = e.clientX - r.left;
        const py = e.clientY - r.top;
        const next = py <= 4 ? 'top' : px <= 4 ? 'left' : px >= W - 4 ? 'right' : null;
        if (next !== zone) {
          zone = next;
          showSnap(zone);
        }
      };
      const up = () => {
        bar.removeEventListener('pointermove', move);
        bar.removeEventListener('pointerup', up);
        bar.removeEventListener('pointercancel', up);
        if (zone) snapTo(win, zone);
        showSnap(null);
        zone = null;
      };
      bar.addEventListener('pointermove', move);
      bar.addEventListener('pointerup', up);
      bar.addEventListener('pointercancel', up);
      ev.preventDefault();
    });

    win.querySelectorAll('.grip').forEach((grip) => {
      grip.addEventListener('pointerdown', (ev) => {
        if (ev.button !== 0) return;
        const dir = grip.dataset.dir;
        const app = meta(id);
        const sx = ev.clientX;
        const sy = ev.clientY;
        const o = {
          x: parseFloat(win.style.getPropertyValue('--x')),
          y: parseFloat(win.style.getPropertyValue('--y')),
          w: parseFloat(win.style.getPropertyValue('--w')),
          h: parseFloat(win.style.getPropertyValue('--h')),
        };
        const { w: W, h: H } = area();
        grip.setPointerCapture(ev.pointerId);
        const move = (e) => {
          const dx = e.clientX - sx;
          const dy = e.clientY - sy;
          let { x, y, w, h } = o;
          // A janela não sai do ambiente de trabalho por nenhum dos
          // lados: o mínimo da aplicação de um lado, a borda do outro.
          if (dir.includes('e')) w = Math.min(W - o.x, Math.max(app.win.minW, o.w + dx));
          if (dir.includes('s')) h = Math.min(H - o.y, Math.max(app.win.minH, o.h + dy));
          if (dir.includes('w')) {
            w = Math.min(o.x + o.w, Math.max(app.win.minW, o.w - dx));
            x = o.x + (o.w - w);
          }
          if (dir.includes('n')) {
            h = Math.min(o.y + o.h, Math.max(app.win.minH, o.h - dy));
            y = Math.max(0, o.y + (o.h - h));
          }
          win.style.setProperty('--x', x + 'px');
          win.style.setProperty('--y', y + 'px');
          win.style.setProperty('--w', w + 'px');
          win.style.setProperty('--h', h + 'px');
        };
        const up = () => {
          grip.removeEventListener('pointermove', move);
          grip.removeEventListener('pointerup', up);
          grip.removeEventListener('pointercancel', up);
        };
        grip.addEventListener('pointermove', move);
        grip.addEventListener('pointerup', up);
        grip.addEventListener('pointercancel', up);
        ev.preventDefault();
      });
    });
  }

  // ── Dock ────────────────────────────────────────────────────
  function syncDock() {
    dock.querySelectorAll('[data-open]').forEach((el) => {
      el.classList.toggle('running', wins.has(el.dataset.open));
    });
  }

  function bounce(id) {
    if (reducedMotion()) return;
    const item = dock.querySelector(`[data-open="${id}"]`);
    if (!item) return;
    item.classList.add('bouncing');
    setTimeout(() => item.classList.remove('bouncing'), 1300);
  }

  const items = () => [...dock.querySelectorAll('.dock-item')];

  dock.addEventListener('pointermove', (ev) => {
    if (reducedMotion() || ev.pointerType === 'touch') return;
    items().forEach((el) => {
      const r = el.getBoundingClientRect();
      const d = Math.abs(ev.clientX - (r.left + r.width / 2));
      const reach = r.width * 2.6;
      const t = Math.max(0, 1 - d / reach);
      el.style.setProperty('--s', (1 + 0.5 * t * t).toFixed(3));
    });
  });
  dock.addEventListener('pointerleave', () => items().forEach((el) => el.style.setProperty('--s', '1')));

  const trash = dock.querySelector('[data-trash]');
  if (trash) trash.addEventListener('click', () => alertBox(s.trash, s.trashEmpty));

  // ── Diálogos ────────────────────────────────────────────────
  function alertBox(title, body) {
    const el = document.createElement('div');
    el.className = 'win focused dialog';
    el.style.cssText = '--w:340px;--h:auto;left:50%;top:26%;transform:translateX(-50%);z-index:800;height:auto';
    el.innerHTML =
      `<div class="dialog-body"><strong>${esc(title)}</strong><p>${esc(body)}</p>` +
      `<button class="btn btn-primary" type="button">OK</button></div>`;
    layer.appendChild(el);
    const kill = () => el.remove();
    el.querySelector('button').addEventListener('click', kill);
    setTimeout(() => el.querySelector('button').focus(), 30);
  }

  // ── Menus da barra ──────────────────────────────────────────
  function closeMenus() {
    if (openMenu) openMenu.remove();
    openMenu = null;
    menubar.querySelectorAll('[aria-expanded]').forEach((b) => b.setAttribute('aria-expanded', 'false'));
  }

  // O menu da aplicação activa tem a forma que o macOS lhe dá: o nome
  // sozinho em cima, e depois o que se pode fazer com ela. O subtítulo
  // não entra — no macOS um item de menu é uma frase curta, e é ele
  // que manda na largura do menu inteiro.
  function menuFor(key) {
    if (key === 'app') {
      const app = ctx.active ? meta(ctx.active) : null;
      return app
        ? [
            { label: s.aboutApp ? s.aboutApp.replace('%s', app.name) : app.name, action: 'open:sobre' },
            { label: '—', action: '' },
            { label: s.close, action: 'close', key: '⌘W' },
          ]
        : ctx.data.menus.apple;
    }
    return ctx.data.menus[key] || [];
  }

  function buildMenu(button, key) {
    closeMenus();
    const list = menuFor(key);
    const el = document.createElement('div');
    el.className = 'menu glass';
    el.setAttribute('role', 'menu');
    el.innerHTML = list
      .map((m) =>
        m.label === '—'
          ? '<hr role="separator" />'
          : '<button type="button" role="menuitem" tabindex="-1" data-action="' +
            esc(m.action) +
            '"' +
            (m.action ? '' : ' disabled aria-disabled="true"') +
            '><span class="mi-label">' +
            esc(m.label) +
            '</span>' +
            (m.key ? '<span class="mi-key">' + esc(m.key) + '</span>' : '') +
            '</button>'
      )
      .join('');
    root.appendChild(el);
    if (ctx.addGlass) ctx.addGlass(el);

    // Posição: o menu cai da barra alinhado pela borda esquerda do
    // título, como no macOS — e se não couber, encosta à direita do
    // ecrã em vez de o esticar.
    const r = button.getBoundingClientRect();
    const gap = 4;
    const w = el.offsetWidth;
    const left = Math.max(gap, Math.min(r.left, window.innerWidth - w - gap));
    el.style.left = Math.round(left) + 'px';
    el.style.top = Math.round(r.bottom + 1) + 'px';
    el.style.maxHeight = Math.round(window.innerHeight - r.bottom - 12) + 'px';

    openMenu = el;
    button.setAttribute('aria-expanded', 'true');
    el.addEventListener('click', (ev) => {
      const b = ev.target.closest('button[data-action]');
      if (!b || !b.dataset.action) return;
      closeMenus();
      ctx.run(b.dataset.action);
    });
    // Setas, como num menu a sério. O Enter e o Escape já são tratados
    // pelo botão e pelo teclado geral.
    el.addEventListener('keydown', (ev) => {
      const items = [...el.querySelectorAll('button:not([disabled])')];
      if (!items.length) return;
      const i = items.indexOf(document.activeElement);
      if (ev.key === 'ArrowDown' || ev.key === 'ArrowUp') {
        ev.preventDefault();
        const down = ev.key === 'ArrowDown';
        if (i < 0) items[down ? 0 : items.length - 1].focus();
        else items[(i + (down ? 1 : -1) + items.length) % items.length].focus();
      } else if (ev.key === 'Home') {
        ev.preventDefault();
        items[0].focus();
      } else if (ev.key === 'End') {
        ev.preventDefault();
        items[items.length - 1].focus();
      }
    });
  }

  menubar.addEventListener('click', (ev) => {
    const b = ev.target.closest('[data-menu]');
    if (b) {
      if (openMenu && b.getAttribute('aria-expanded') === 'true') closeMenus();
      else buildMenu(b, b.dataset.menu);
      return;
    }
    const a = ev.target.closest('[data-action]');
    if (a) ctx.run(a.dataset.action);
  });
  menubar.addEventListener('pointerover', (ev) => {
    if (!openMenu) return;
    const b = ev.target.closest('[data-menu]');
    if (b && b.getAttribute('aria-expanded') !== 'true') buildMenu(b, b.dataset.menu);
  });

  // ── Menu do botão direito ───────────────────────────────────
  document.getElementById('desktop').addEventListener('contextmenu', (ev) => {
    if (ev.target.closest('.win')) return;
    ev.preventDefault();
    if (ctxMenu) ctxMenu.remove();
    const walls = ['aurora', 'sonoma', 'night', 'graphite'];
    const next = walls[(walls.indexOf(prefs.wallpaper) + 1) % walls.length];
    const el = document.createElement('div');
    el.className = 'ctx glass';
    el.innerHTML =
      `<button type="button" data-action="open:terminal">${esc(meta('terminal').name)}</button>` +
      `<button type="button" data-action="wallpaper:${next}">${esc(s.control.wallpaper)} — ${esc((s.wallpaperNames && s.wallpaperNames[next]) || next)}</button>` +
      `<button type="button" data-action="theme">${esc(s.control.theme)}</button>` +
      `<button type="button" data-action="open:definicoes">${esc(meta('definicoes').name)}</button>`;
    el.style.left = Math.min(ev.clientX, window.innerWidth - 210) + 'px';
    el.style.top = ev.clientY + 'px';
    root.appendChild(el);
    if (ctx.addGlass) ctx.addGlass(el);
    ctxMenu = el;
    el.addEventListener('click', (e) => {
      const b = e.target.closest('button');
      if (!b) return;
      el.remove();
      ctxMenu = null;
      ctx.run(b.dataset.action);
    });
  });

  document.addEventListener('pointerdown', (ev) => {
    if (openMenu && !ev.target.closest('.menu') && !ev.target.closest('[data-menu]')) closeMenus();
    if (ctxMenu && !ev.target.closest('.ctx')) {
      ctxMenu.remove();
      ctxMenu = null;
    }
  });

  // ── Pesquisa ────────────────────────────────────────────────
  function spotOpen() {
    spotlight.hidden = false;
    spotInput.value = '';
    renderSpot('');
    setTimeout(() => spotInput.focus(), 20);
  }
  function spotClose() {
    spotlight.hidden = true;
  }
  const spotVisible = () => !spotlight.hidden;

  function renderSpot(query) {
    const q = query.trim().toLowerCase();
    const match = (t) => !q || String(t).toLowerCase().includes(q);
    const groups = [];
    const apps = ctx.data.apps.filter((a) => match(a.name) || match(a.subtitle));
    if (apps.length)
      groups.push({
        title: s.searchApps,
        items: apps.map((a) => ({ icon: 'icon-' + a.id, label: a.name, sub: a.subtitle, action: 'open:' + a.id })),
      });
    const posts = ctx.data.posts.filter((p) => match(p.title) || match(p.description));
    if (posts.length)
      groups.push({
        title: s.searchPosts,
        items: posts.map((p) => ({ icon: 'ui-note', label: p.title, sub: p.date, action: 'post:' + p.slug })),
      });
    const links = [
      { label: 'GitHub', action: 'link:github' },
      { label: 'LinkedIn', action: 'link:linkedin' },
      { label: 'X', action: 'link:twitter' },
      { label: ctx.data.site.email, action: 'mail' },
    ].filter((l) => match(l.label));
    if (links.length)
      groups.push({ title: s.searchLinks, items: links.map((l) => ({ icon: 'ui-arrow', label: l.label, sub: '', action: l.action })) });

    spotItems = [];
    spotResults.innerHTML = groups.length
      ? groups
          .map((g) => {
            const rows = g.items
              .map((it) => {
                spotItems.push(it);
                return (
                  `<button class="spot-item" type="button" role="option" data-action="${esc(it.action)}">` +
                  `<svg viewBox="0 0 100 100" aria-hidden="true"><use href="#${esc(it.icon)}"/></svg>` +
                  `<span>${esc(it.label)}</span><span class="sub">${esc(it.sub || '')}</span></button>`
                );
              })
              .join('');
            return `<p class="spot-group">${esc(g.title)}</p>${rows}`;
          })
          .join('')
      : `<p class="spot-group">${esc(s.searchEmpty)}</p>`;
    spotIndex = 0;
    markSpot();
  }

  function markSpot() {
    const els = [...spotResults.querySelectorAll('.spot-item')];
    els.forEach((el, i) => el.setAttribute('aria-selected', i === spotIndex ? 'true' : 'false'));
    const cur = els[spotIndex];
    if (cur) cur.scrollIntoView({ block: 'nearest' });
  }

  spotInput.addEventListener('input', () => renderSpot(spotInput.value));
  spotResults.addEventListener('click', (ev) => {
    const b = ev.target.closest('.spot-item');
    if (!b) return;
    spotClose();
    ctx.run(b.dataset.action);
  });
  spotlight.addEventListener('click', (ev) => {
    if (ev.target === spotlight) spotClose();
  });
  spotInput.addEventListener('keydown', (ev) => {
    const els = spotResults.querySelectorAll('.spot-item');
    if (ev.key === 'ArrowDown') {
      spotIndex = Math.min(els.length - 1, spotIndex + 1);
      markSpot();
      ev.preventDefault();
    } else if (ev.key === 'ArrowUp') {
      spotIndex = Math.max(0, spotIndex - 1);
      markSpot();
      ev.preventDefault();
    } else if (ev.key === 'Enter') {
      const it = spotItems[spotIndex];
      if (it) {
        spotClose();
        ctx.run(it.action);
      }
      ev.preventDefault();
    }
  });

  // ── Teclado ─────────────────────────────────────────────────
  document.addEventListener('keydown', (ev) => {
    if (ctx.mode !== 'mac') return;
    const cmd = ev.metaKey || ev.ctrlKey;
    if (cmd && ev.key.toLowerCase() === 'k') {
      ev.preventDefault();
      spotVisible() ? spotClose() : spotOpen();
      return;
    }
    if (ev.key === 'Escape') {
      if (spotVisible()) spotClose();
      else closeMenus();
      return;
    }
    if (cmd && ev.key === 'Tab') {
      ev.preventDefault();
      if (!switcherEl) {
        if (!openAppSwitcher()) return;
      } else {
        switcherIndex = (switcherIndex + (ev.shiftKey ? -1 : 1) + order.length) % order.length;
        markSwitcher();
      }
      return;
    }
    if (!cmd) return;
    const key = ev.key.toLowerCase();
    if (key === 'w' && ctx.active) {
      ev.preventDefault();
      close(ctx.active);
    } else if (key === 'm' && ctx.active) {
      ev.preventDefault();
      minimize(ctx.active);
    }
  });

  document.addEventListener('keyup', (ev) => {
    if (switcherEl && (ev.key === 'Meta' || ev.key === 'Control')) closeAppSwitcher(true);
  });

  window.addEventListener('resize', () => {
    const { w: W, h: H } = area();
    wins.forEach((win) => {
      if (win.classList.contains('zoomed')) {
        win.style.setProperty('--w', W + 'px');
        win.style.setProperty('--h', H + 'px');
        return;
      }
      const x = parseFloat(win.style.getPropertyValue('--x'));
      const y = parseFloat(win.style.getPropertyValue('--y'));
      win.style.setProperty('--x', Math.max(-win.offsetWidth + 90, Math.min(W - 90, x)) + 'px');
      win.style.setProperty('--y', Math.max(0, Math.min(H - 44, y)) + 'px');
    });
  });

  function teardown() {
    [...wins.keys()].forEach((id) => {
      ctx.releaseContent(id);
      wins.get(id).remove();
      wins.delete(id);
    });
    closeMenus();
    spotClose();
    setActiveLabel(null);
    syncDock();
  }

  function themeCycle() {
    setPref('theme', effectiveTheme() === 'dark' ? 'light' : 'dark');
    ctx.syncSettings();
  }


  // ── Encaixe de janelas nas margens ──────────────────────────
  let snapEl = null;
  function snapRect(zone) {
    const { w: W, h: H } = area();
    if (zone === 'top') return { x: 0, y: 0, w: W, h: H };
    if (zone === 'left') return { x: 0, y: 0, w: Math.round(W / 2), h: H };
    if (zone === 'right') return { x: Math.round(W / 2), y: 0, w: Math.round(W / 2), h: H };
    return null;
  }
  function showSnap(zone) {
    const r = snapRect(zone);
    if (!r) {
      if (snapEl) snapEl.remove();
      snapEl = null;
      return;
    }
    if (!snapEl) {
      snapEl = document.createElement('div');
      snapEl.className = 'snap-preview';
      layer.appendChild(snapEl);
    }
    snapEl.style.cssText =
      'left:' + r.x + 'px;top:' + r.y + 'px;width:' + r.w + 'px;height:' + r.h + 'px';
  }
  function snapTo(win, zone) {
    const r = snapRect(zone);
    if (!r) return;
    win.classList.remove('zoomed');
    win.classList.add('snapping');
    win.style.setProperty('--x', r.x + 'px');
    win.style.setProperty('--y', r.y + 'px');
    win.style.setProperty('--w', r.w + 'px');
    win.style.setProperty('--h', r.h + 'px');
    setTimeout(() => win.classList.remove('snapping'), 220);
  }

  // ── ⌘Tab ────────────────────────────────────────────────────
  let switcherEl = null;
  let switcherIndex = 0;
  let order = [];

  function openAppSwitcher() {
    order = [...wins.keys()].reverse();
    if (order.length < 2) return false;
    switcherIndex = 1;
    if (!switcherEl) {
      switcherEl = document.createElement('div');
      switcherEl.className = 'cmdtab glass';
      root.appendChild(switcherEl);
      if (ctx.addGlass) ctx.addGlass(switcherEl);
    }
    switcherEl.innerHTML = order
      .map(
        (id) =>
          '<button class="cmdtab-item" type="button" data-id="' + esc(id) + '">' +
          '<svg viewBox="0 0 100 100" aria-hidden="true"><use href="#icon-' + esc(id) + '"/></svg>' +
          '<span>' + esc(meta(id).name) + '</span></button>'
      )
      .join('');
    switcherEl.addEventListener('click', (ev) => {
      const b = ev.target.closest('[data-id]');
      if (b) {
        closeAppSwitcher();
        open(b.dataset.id);
      }
    });
    markSwitcher();
    return true;
  }
  function markSwitcher() {
    if (!switcherEl) return;
    [...switcherEl.children].forEach((el, i) => el.classList.toggle('on', i === switcherIndex));
  }
  function closeAppSwitcher(activate) {
    if (!switcherEl) return;
    const id = order[switcherIndex];
    switcherEl.remove();
    switcherEl = null;
    if (activate && id) open(id);
  }

  return {
    open,
    close,
    focus,
    minimize,
    zoom,
    tile,
    closeAll,
    teardown,
    spotOpen,
    spotClose,
    snapTo,
    openAppSwitcher,
    themeCycle,
    alertBox,
    has: (id) => wins.has(id),
  };
}
