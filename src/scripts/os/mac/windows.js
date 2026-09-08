// ─────────────────────────────────────────────────────────────────────
// As janelas.
//
// Onde nascem, como se arrastam, como se redimensionam, e quem está à
// frente de quem. É a peça maior do Mac, e é aqui que estão as decisões
// que fazem uma janela parecer uma janela:
//
//   - o tamanho nunca chega a tapar o ecrã, senão não há o que sobrepor;
//   - cada janela nova nasce um degrau abaixo e à direita da anterior;
//   - nasce a crescer do ícone em que se carregou, e volta lá ao
//     minimizar;
//   - ao fechar, o foco passa à que está mesmo à frente, não à última
//     que foi criada.
// ─────────────────────────────────────────────────────────────────────
import { reducedMotion } from '../state.js';
import { esc } from '../lib/dom.js';

const DIRS = ['n', 's', 'e', 'w', 'ne', 'nw', 'se', 'sw'];

/** O degrau da escada de janelas, em píxeis. */
const STEP = 24;

/** Que fatia do ambiente de trabalho uma janela nova pode ocupar. */
const SHARE = { w: 0.74, h: 0.78 };

// A banda onde as janelas vivem. O tecto existe porque cada foco subia
// o contador um degrau e nada o trazia para baixo: ao fim de umas
// centenas de cliques as janelas passavam por cima da Dock (300) e da
// barra de menus (400), que no macOS estão sempre por cima de tudo.
const Z_FLOOR = 20;
const Z_CEIL = 240;

export function createWindows(desk) {
  const { ctx, wins, els, s } = desk;
  const { layer, menuApp } = els;

  let zTop = Z_FLOOR;

  // ── Onde e de que tamanho ──────────────────────────────────────────

  /**
   * O tamanho que a aplicação pede, apertado ao que o ecrã permite.
   * Uma janela que ocupa tudo não é uma janela — é um modo de ecrã
   * inteiro, e deixa de haver o que sobrepor.
   */
  function cap(want, min, avail, share) {
    const max = Math.max(min, Math.min(avail - 32, Math.round(avail * share)));
    return Math.max(Math.min(want, max), Math.min(min, avail - 24));
  }

  /**
   * Sempre perto do centro: o degrau da cascata conta-se pelas janelas
   * que estão mesmo abertas agora (`wins.size`), nunca por um contador
   * histórico — senão, ao fim de uma sessão longa a abrir e fechar
   * janelas, o degrau ia fugindo do centro sem que houvesse ali
   * sobreposição nenhuma para justificar.
   */
  function place(w, h) {
    const { w: W, h: H } = desk.area();
    const baseX = Math.max(12, Math.min(W - w - 12, Math.round((W - w) / 2) - 60));
    const baseY = 22;
    const steps = Math.max(1, Math.floor(Math.min(W - w - baseX - 16, H - h - baseY - 72) / STEP));
    const i = wins.size % steps;
    return {
      x: Math.max(12, Math.min(W - w - 12, baseX + i * STEP)),
      y: Math.max(8, Math.min(H - h - 56, baseY + i * STEP)),
    };
  }

  /**
   * Escreve na janela a distância até um elemento, para a animação
   * poder crescer a partir dele — ou encolher para ele.
   * @param {'from'|'to'} prefix
   */
  function anchor(win, el, prefix) {
    if (!el) return false;
    const a = el.getBoundingClientRect();
    const b = win.getBoundingClientRect();
    if (!a.width || !b.width) return false;
    const set = (name, value) => win.style.setProperty('--' + prefix + '-' + name, value);
    set('x', Math.round(a.left + a.width / 2 - (b.left + b.width / 2)) + 'px');
    set('y', Math.round(a.top + a.height / 2 - (b.top + b.height / 2)) + 'px');
    set('s', Math.max(0.05, a.width / b.width).toFixed(3));
    return true;
  }

  // ── Abrir, fechar, focar ───────────────────────────────────────────

  function open(id, from) {
    const existing = wins.get(id);
    if (existing) {
      if (existing.classList.contains('minimized')) {
        existing.classList.remove('minimized');
        if (!reducedMotion()) {
          anchor(existing, from || desk.dock.iconFor(id), 'from');
          existing.classList.add('opening');
          setTimeout(() => existing.classList.remove('opening'), 300);
        }
      }
      focus(id);
      return existing;
    }

    const app = desk.meta(id);
    if (!app) return null;
    const { w: W, h: H } = desk.area();
    const w = cap(app.win.w, app.win.minW, W, SHARE.w);
    const h = cap(app.win.h, app.win.minH, H, SHARE.h);
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
    wins.set(id, win);
    desk.dragging.wire(win, id, { close, minimize, zoom, focus, rectOf, setRect });
    focus(id);
    desk.dock.bounce(id);
    if (!reducedMotion()) {
      anchor(win, from || desk.dock.iconFor(id), 'from');
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
      else setActiveLabel(null);
      desk.dock.sync();
    };
    if (reducedMotion()) done();
    else setTimeout(done, 150);
  }

  /**
   * Volta a numerar as janelas de baixo para cima, mantendo a ordem que
   * já tinham. Chamado quando o contador chega ao tecto da banda.
   */
  function renumber() {
    const byDepth = [...wins.values()].sort(
      (a, b) => (parseInt(a.style.zIndex, 10) || 0) - (parseInt(b.style.zIndex, 10) || 0)
    );
    zTop = Z_FLOOR;
    byDepth.forEach((w) => (w.style.zIndex = String(++zTop)));
  }

  function focus(id) {
    const win = wins.get(id);
    if (!win) return;
    wins.forEach((w) => w.classList.remove('focused'));
    win.classList.add('focused');
    if (zTop >= Z_CEIL) renumber();
    win.style.zIndex = String(++zTop);
    ctx.setOpen(id, true);
    setActiveLabel(id);
    desk.dock.sync();
  }

  function setActiveLabel(id) {
    const app = id ? desk.meta(id) : null;
    menuApp.textContent = app ? app.name : 'Finder';
    ctx.active = id;
  }

  /** Qual é a janela que está mesmo à frente de todas as outras. */
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

  // ── Minimizar, ampliar, arrumar ────────────────────────────────────

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
    if (reducedMotion() || !anchor(win, desk.dock.iconFor(key), 'to')) {
      after();
      return;
    }
    win.classList.add('minimizing');
    setTimeout(after, 280);
  }

  const rectOf = (win) => ({
    x: parseFloat(win.style.getPropertyValue('--x')),
    y: parseFloat(win.style.getPropertyValue('--y')),
    w: parseFloat(win.style.getPropertyValue('--w')),
    h: parseFloat(win.style.getPropertyValue('--h')),
  });

  function setRect(win, r) {
    win.style.setProperty('--x', r.x + 'px');
    win.style.setProperty('--y', r.y + 'px');
    win.style.setProperty('--w', r.w + 'px');
    win.style.setProperty('--h', r.h + 'px');
  }

  function zoom(id) {
    const win = wins.get(id || ctx.active);
    if (!win) return;
    const { w: W, h: H } = desk.area();

    const target = win.classList.contains('zoomed')
      ? (win.dataset.rect ? JSON.parse(win.dataset.rect) : rectOf(win))
      : { x: 0, y: 0, w: W, h: H };

    if (!win.classList.contains('zoomed')) win.dataset.rect = JSON.stringify(rectOf(win));
    win.classList.toggle('zoomed');

    // O retângulo estica-se até ao novo tamanho — não troca de repente.
    if (reducedMotion()) {
      setRect(win, target);
      return;
    }
    win.classList.add('zooming');
    setRect(win, target);
    win.addEventListener('transitionend', () => win.classList.remove('zooming'), { once: true });
  }

  /** Arruma as janelas abertas numa grelha, sem sobreposição. */
  function tile() {
    const list = [...wins.values()].filter((w) => !w.classList.contains('minimized'));
    if (!list.length) return;
    const { w: W, h: H } = desk.area();
    const gap = 16;
    const cols = Math.ceil(Math.sqrt(list.length));
    const rows = Math.ceil(list.length / cols);
    const cw = (W - gap * (cols + 1)) / cols;
    const ch = (H - 80 - gap * (rows + 1)) / rows;
    list.forEach((win, i) => {
      win.classList.remove('zoomed');
      setRect(win, {
        x: gap + (i % cols) * (cw + gap),
        y: gap + Math.floor(i / cols) * (ch + gap),
        w: cw,
        h: ch,
      });
    });
  }

  const closeAll = () => [...wins.keys()].forEach(close);

  // Quando o ecrã muda de tamanho, ninguém fica lá fora.
  window.addEventListener('resize', () => {
    const { w: W, h: H } = desk.area();
    wins.forEach((win) => {
      if (win.classList.contains('zoomed')) {
        win.style.setProperty('--w', W + 'px');
        win.style.setProperty('--h', H + 'px');
        return;
      }
      const o = rectOf(win);
      win.style.setProperty('--x', Math.max(-win.offsetWidth + 90, Math.min(W - 90, o.x)) + 'px');
      win.style.setProperty('--y', Math.max(0, Math.min(H - 44, o.y)) + 'px');
    });
  });

  function teardown() {
    [...wins.keys()].forEach((id) => {
      ctx.releaseContent(id);
      wins.get(id).remove();
      wins.delete(id);
    });
    setActiveLabel(null);
    desk.dock.sync();
  }

  return { open, close, focus, minimize, zoom, tile, closeAll, topmost, setActiveLabel, teardown };
}
