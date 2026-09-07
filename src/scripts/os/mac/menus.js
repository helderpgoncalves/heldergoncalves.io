// ─────────────────────────────────────────────────────────────────────
// Os menus: o da barra e o do botão direito.
//
// Um menu do macOS tem a largura do item mais comprido que tem dentro —
// nunca a da janela, nunca a do ecrã. É por isso que o item da aplicação
// activa é só o nome dela: um subtítulo colado ali esticava o menu todo.
// ─────────────────────────────────────────────────────────────────────
import { esc } from '../lib/dom.js';

export function createMenus(desk) {
  const { ctx, els, s } = desk;
  const { menubar, root } = els;

  let openMenu = null;
  let ctxMenu = null;

  // A bateria a sério, onde o browser a der (Chromium). Nos outros
  // fica a 100 %, que é o que se espera de um Mac ligado à corrente.
  let battery = null;
  if (navigator.getBattery) navigator.getBattery().then((b) => (battery = b), () => {});

  function closeAll() {
    if (openMenu) openMenu.remove();
    openMenu = null;
    menubar.querySelectorAll('[aria-expanded]').forEach((b) => b.setAttribute('aria-expanded', 'false'));
  }

  /**
   * O menu da aplicação activa tem a forma que o macOS lhe dá: o nome
   * sozinho em cima, e depois o que se pode fazer com ela.
   */
  function itemsFor(key) {
    if (key === 'wifi') {
      return [
        { label: s.wifiOn, action: '' },
        { label: '—', action: '' },
        { label: '✓ ' + ctx.data.site.name, action: 'link:github' },
        { label: '—', action: '' },
        { label: s.networkSettings, action: 'open:definicoes' },
      ];
    }
    if (key === 'battery') {
      const level = battery ? Math.round(battery.level * 100) : 100;
      return [
        { label: s.batteryLevel.replace('%s', String(level)), action: '' },
        { label: battery && battery.charging ? s.batteryCharging : s.batterySource, action: '' },
        { label: '—', action: '' },
        { label: s.control.title, action: 'open:definicoes' },
      ];
    }
    if (key !== 'app') return ctx.data.menus[key] || [];
    const app = ctx.active ? desk.meta(ctx.active) : null;
    if (!app) return ctx.data.menus.apple;
    return [
      { label: s.aboutApp ? s.aboutApp.replace('%s', app.name) : app.name, action: 'open:sobre' },
      { label: '—', action: '' },
      { label: s.close, action: 'close', key: '⌘W' },
    ];
  }

  const renderItem = (m) =>
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
        '</button>';

  /** Setas, como num menu a sério. O Enter é do botão, o Escape é global. */
  function wireArrows(el) {
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

  function build(button, key) {
    closeAll();
    const el = document.createElement('div');
    el.className = 'menu glass';
    el.setAttribute('role', 'menu');
    el.innerHTML = itemsFor(key).map(renderItem).join('');
    root.appendChild(el);

    // Cai da barra alinhado pela borda esquerda do título — e se não
    // couber, encosta à direita do ecrã em vez de o esticar.
    const r = button.getBoundingClientRect();
    const gap = 4;
    const left = Math.max(gap, Math.min(r.left, window.innerWidth - el.offsetWidth - gap));
    el.style.left = Math.round(left) + 'px';
    el.style.top = Math.round(r.bottom + 1) + 'px';
    el.style.maxHeight = Math.round(window.innerHeight - r.bottom - 12) + 'px';

    openMenu = el;
    button.setAttribute('aria-expanded', 'true');
    el.addEventListener('click', (ev) => {
      const b = ev.target.closest('button[data-action]');
      if (!b || !b.dataset.action) return;
      closeAll();
      ctx.run(b.dataset.action);
    });
    wireArrows(el);
  }

  menubar.addEventListener('click', (ev) => {
    const b = ev.target.closest('[data-menu]');
    if (b) {
      if (openMenu && b.getAttribute('aria-expanded') === 'true') closeAll();
      else build(b, b.dataset.menu);
      return;
    }
    const a = ev.target.closest('[data-action]');
    if (a) ctx.run(a.dataset.action);
  });

  // Com um menu aberto, passar por cima de outro título troca de menu —
  // como no macOS.
  menubar.addEventListener('pointerover', (ev) => {
    if (!openMenu) return;
    const b = ev.target.closest('[data-menu]');
    if (b && b.getAttribute('aria-expanded') !== 'true') build(b, b.dataset.menu);
  });

  // ── O menu do botão direito ─────────────────────────────────────────

  /** Um menu contextual em (x, y), com estes itens. Um de cada vez. */
  function context(x, y, items) {
    if (ctxMenu) ctxMenu.remove();
    const el = document.createElement('div');
    el.className = 'ctx glass';
    el.setAttribute('role', 'menu');
    el.innerHTML = items.map(renderItem).join('');
    root.appendChild(el);
    el.style.left = Math.max(4, Math.min(x, window.innerWidth - el.offsetWidth - 4)) + 'px';
    el.style.top = Math.max(4, Math.min(y, window.innerHeight - el.offsetHeight - 4)) + 'px';
    ctxMenu = el;
    el.addEventListener('click', (e) => {
      const b = e.target.closest('button[data-action]');
      if (!b || !b.dataset.action) return;
      el.remove();
      ctxMenu = null;
      ctx.run(b.dataset.action);
    });
    wireArrows(el);
  }

  // No ambiente de trabalho: o que se faz ao Mac.
  document.getElementById('desktop').addEventListener('contextmenu', (ev) => {
    if (ev.target.closest('.win, .widget')) return;
    ev.preventDefault();
    const walls = ['aurora', 'sonoma', 'night', 'graphite'];
    const next = walls[(walls.indexOf(desk.wallpaper()) + 1) % walls.length];
    const names = s.wallpaperNames || {};
    context(ev.clientX, ev.clientY, [
      { label: desk.meta('terminal').name, action: 'open:terminal' },
      { label: s.control.wallpaper + ' — ' + (names[next] || next), action: 'wallpaper:' + next },
      { label: s.control.theme, action: 'theme' },
      { label: '—', action: '' },
      { label: s.widgets.edit, action: 'widgets' },
      { label: desk.meta('definicoes').name, action: 'open:definicoes' },
    ]);
  });

  // Na Dock: o que se faz a uma aplicação.
  els.dock.addEventListener('contextmenu', (ev) => {
    const item = ev.target.closest('[data-open]');
    if (!item) return;
    ev.preventDefault();
    const id = item.dataset.open;
    const open = desk.wins.has(id);
    context(ev.clientX, ev.clientY - 8, [
      { label: desk.meta(id).name, action: '' },
      { label: '—', action: '' },
      { label: open ? s.dockShow : s.dockOpen, action: 'open:' + id },
      ...(open ? [{ label: s.dockClose, action: 'closeApp:' + id }] : []),
    ]);
  });

  document.addEventListener('pointerdown', (ev) => {
    if (openMenu && !ev.target.closest('.menu') && !ev.target.closest('[data-menu]')) closeAll();
    if (ctxMenu && !ev.target.closest('.ctx')) {
      ctxMenu.remove();
      ctxMenu = null;
    }
  });

  return { closeAll };
}
