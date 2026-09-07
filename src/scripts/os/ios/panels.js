// ─────────────────────────────────────────────────────────────────────
// Os painéis que descem de cima: a Central de Controlo à direita, as
// notificações à esquerda.
//
// `sheet()` faz um painel qualquer. Puxa-se de uma zona sensível no
// topo, empurra-se para cima lá de dentro para fechar, e em ambos os
// casos o painel segue o dedo — a decisão de abrir ou fechar é tomada
// no fim, com o embalo contado.
// ─────────────────────────────────────────────────────────────────────
import { effectiveTheme, prefs, setPref } from '../state.js';
import { track, clamp, project } from '../gesture.js';

const WALLPAPERS = ['aurora', 'sonoma', 'night', 'graphite'];

/** Quanto do ecrã é preciso percorrer para o painel ficar aberto/fechado. */
const OPEN_AT = 0.16;
const CLOSE_AT = 0.14;

export function createPanels(ph) {
  const { ctx, els, s } = ph;
  const { phone, cc, nc } = els;

  function sheet(el, hotspot, onOpen) {
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
            const p = clamp(g.dy / (phone.clientHeight || 1), 0, 1);
            el.style.transform = 'translate3d(0,' + (p - 1) * 100 + '%,0)';
          },
          end: (g) => {
            el.classList.remove('dragging');
            el.style.transition = '';
            el.style.willChange = '';
            if (g.dy + project(g.vy) > (phone.clientHeight || 1) * OPEN_AT) openIt();
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
          const p = clamp(-g.dy / (phone.clientHeight || 1), 0, 1);
          el.style.transform = 'translate3d(0,' + -p * 100 + '%,0)';
        },
        end: (g) => {
          el.style.transition = '';
          if (-g.dy - project(g.vy) > (phone.clientHeight || 1) * CLOSE_AT) closeIt();
          else openIt();
        },
      },
      { axis: 'y', threshold: 10, filter: (ev) => !ev.target.closest('a, .cc-slider, .nc-inner') }
    );

    return { open: openIt, close: closeIt };
  }

  const hotspot = (className) => {
    const el = document.createElement('div');
    el.className = className;
    el.setAttribute('aria-hidden', 'true');
    phone.appendChild(el);
    return el;
  };

  const ccSheet = sheet(cc, hotspot('cc-hotspot'), () => syncCC());
  const ncSheet = sheet(nc, hotspot('nc-hotspot'), null);

  if (nc) {
    const ncClose = nc.querySelector('[data-nc-close]');
    if (ncClose) ncClose.addEventListener('click', () => ncSheet.close());
  }

  // ── A Central de Controlo ──────────────────────────────────────────
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

  /** O que cada mosaico faz. Acrescentar um é acrescentar uma entrada. */
  const TILES = {
    close: () => ccSheet.close(),
    theme: () => {
      setPref('theme', effectiveTheme() === 'dark' ? 'light' : 'dark');
      ctx.syncSettings();
      syncCC();
    },
    wallpaper: () => {
      setPref('wallpaper', WALLPAPERS[(WALLPAPERS.indexOf(prefs.wallpaper) + 1) % WALLPAPERS.length]);
      ctx.syncSettings();
      syncCC();
    },
    lang: () => (location.href = ctx.data.altHome),
    settings: () => {
      ccSheet.close();
      ctx.run('open:definicoes');
    },
  };

  if (cc)
    cc.addEventListener('click', (ev) => {
      const t = ev.target.closest('[data-cc]');
      const run = t && TILES[t.dataset.cc];
      if (run) run();
    });

  // ── O brilho ───────────────────────────────────────────────────────
  const slider = cc ? cc.querySelector('.cc-slider') : null;
  if (slider) {
    const setFrom = (y) => {
      const r = slider.getBoundingClientRect();
      const p = Math.round(clamp(((r.bottom - y) / r.height) * 100, 25, 100));
      setPref('brightness', p);
      slider.setAttribute('aria-valuenow', String(p));
      syncCC();
    };
    track(slider, { down: (g) => setFrom(g.y0), move: (g) => setFrom(g.y) }, { threshold: 0 });
    slider.addEventListener('keydown', (ev) => {
      const step = ev.key === 'ArrowUp' ? 5 : ev.key === 'ArrowDown' ? -5 : 0;
      if (!step) return;
      setPref('brightness', clamp(prefs.brightness + step, 25, 100));
      syncCC();
      ev.preventDefault();
    });
  }

  return {
    openCC: () => ccSheet.open(),
    closeCC: () => ccSheet.close(),
    closeNC: () => ncSheet.close(),
    syncCC,
  };
}
