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

export function createWindows(desk) {
  const { ctx, wins, els, s } = desk;
  const { layer, menuApp } = els;

  let zTop = 20;
  let cascade = 0;

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

  function place(w, h) {
    const { w: W, h: H } = desk.area();
    const baseX = Math.max(12, Math.min(W - w - 12, Math.round((W - w) / 2) - 60));
    const baseY = 22;
    const steps = Math.max(1, Math.floor(Math.min(W - w - baseX - 16, H - h - baseY - 72) / STEP));
    const i = cascade % steps;
    cascade += 1;
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
    if (ctx.addGlass) ctx.addGlass(win);
    wins.set(id, win);
    wire(win, id);
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
      else {
        setActiveLabel(null);
        // Sem janelas abertas, a escada recomeça do primeiro degrau.
        cascade = 0;
      }
      desk.dock.sync();
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

    if (win.classList.contains('zoomed')) {
      win.classList.remove('zoomed');
      // Volta ao que era antes de encher o ecrã.
      if (win.dataset.rect) setRect(win, JSON.parse(win.dataset.rect));
      return;
    }
    win.dataset.rect = JSON.stringify(rectOf(win));
    win.classList.add('zoomed');
    setRect(win, { x: 0, y: 0, w: W, h: H });
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

  // ── Arrastar e redimensionar ───────────────────────────────────────

  function wire(win, id) {
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

    wireDrag(win, id);
    win.querySelectorAll('.grip').forEach((grip) => wireResize(win, id, grip));
  }

  function wireDrag(win, id) {
    const bar = win.querySelector('.win-bar');
    bar.addEventListener('dblclick', () => zoom(id));
    bar.addEventListener('pointerdown', (ev) => {
      if (ev.target.closest('.light') || ev.button !== 0) return;
      if (win.classList.contains('zoomed')) return;

      const startX = ev.clientX;
      const startY = ev.clientY;
      const o = rectOf(win);
      const { w: W, h: H } = desk.area();
      const ww = win.offsetWidth;
      let zone = null;
      bar.setPointerCapture(ev.pointerId);

      const move = (e) => {
        // A barra de título nunca sai do ecrã: fica sempre uma aba de
        // 90 píxeis por onde se possa voltar a agarrar a janela.
        win.style.setProperty('--x', Math.max(-ww + 90, Math.min(W - 90, o.x + e.clientX - startX)) + 'px');
        win.style.setProperty('--y', Math.max(0, Math.min(H - 44, o.y + e.clientY - startY)) + 'px');

        const r = desk.els.layer.getBoundingClientRect();
        const next = desk.snap.zoneAt(e.clientX - r.left, e.clientY - r.top, W);
        if (next !== zone) {
          zone = next;
          desk.snap.show(zone);
        }
      };
      const up = () => {
        bar.removeEventListener('pointermove', move);
        bar.removeEventListener('pointerup', up);
        bar.removeEventListener('pointercancel', up);
        if (zone) desk.snap.to(win, zone);
        desk.snap.show(null);
        zone = null;
      };
      bar.addEventListener('pointermove', move);
      bar.addEventListener('pointerup', up);
      bar.addEventListener('pointercancel', up);
      ev.preventDefault();
    });
  }

  function wireResize(win, id, grip) {
    grip.addEventListener('pointerdown', (ev) => {
      if (ev.button !== 0) return;
      const dir = grip.dataset.dir;
      const app = desk.meta(id);
      const sx = ev.clientX;
      const sy = ev.clientY;
      const o = rectOf(win);
      const { w: W, h: H } = desk.area();
      grip.setPointerCapture(ev.pointerId);

      const move = (e) => {
        const dx = e.clientX - sx;
        const dy = e.clientY - sy;
        let { x, y, w, h } = o;
        // O mínimo da aplicação de um lado, a borda do ecrã do outro.
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
        setRect(win, { x, y, w, h });
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
  }

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
    cascade = 0;
    desk.dock.sync();
  }

  return { open, close, focus, minimize, zoom, tile, closeAll, topmost, setActiveLabel, teardown };
}
