// Motor de gestos. Um sítio só para o que é difícil: capturar o
// ponteiro, travar o eixo, medir velocidade e decidir no fim entre
// completar o gesto ou voltar atrás. Tudo o que desliza no telefone
// passa por aqui — é o que separa "um site" de "um telemóvel".

/** Elástico: quanto mais se puxa para lá do limite, menos anda. */
export const rubber = (distance, limit) => (distance * limit) / (limit + Math.abs(distance) * 0.55);

export const clamp = (v, min, max) => Math.min(max, Math.max(min, v));

/**
 * Segue um dedo (ou o rato) num elemento.
 *
 * opts.axis      'x' | 'y' — cancela o gesto se o dedo escolher o outro eixo
 * opts.threshold píxeis antes de o gesto começar (para não roubar cliques)
 * opts.filter    (ev) => boolean, para ignorar zonas do elemento
 *
 * Os handlers recebem um objeto com dx, dy, vx, vy (px/ms) e o tempo.
 */
export function track(el, handlers, opts = {}) {
  const threshold = opts.threshold == null ? 8 : opts.threshold;
  let g = null;

  const reset = () => {
    g = null;
  };

  const down = (ev) => {
    if (g || (ev.button != null && ev.button !== 0)) return;
    if (opts.filter && !opts.filter(ev)) return;
    const now = performance.now();
    g = {
      id: ev.pointerId,
      x0: ev.clientX,
      y0: ev.clientY,
      x: ev.clientX,
      y: ev.clientY,
      dx: 0,
      dy: 0,
      vx: 0,
      vy: 0,
      t0: now,
      t: now,
      axis: null,
      began: false,
    };
    if (handlers.down) handlers.down(g, ev);
  };

  const move = (ev) => {
    if (!g || ev.pointerId !== g.id) return;
    const now = performance.now();
    const dt = Math.max(8, now - g.t);
    // Média com o valor anterior: velocidade estável mesmo com eventos irregulares.
    g.vx = (g.vx + (ev.clientX - g.x) / dt) / 2;
    g.vy = (g.vy + (ev.clientY - g.y) / dt) / 2;
    g.x = ev.clientX;
    g.y = ev.clientY;
    g.t = now;
    g.dx = g.x - g.x0;
    g.dy = g.y - g.y0;

    if (!g.began) {
      const ax = Math.abs(g.dx);
      const ay = Math.abs(g.dy);
      if (Math.max(ax, ay) < threshold) return;
      g.axis = ax > ay ? 'x' : 'y';
      if (opts.axis && g.axis !== opts.axis) {
        reset();
        return;
      }
      g.began = true;
      try {
        el.setPointerCapture(g.id);
      } catch (_) {}
      if (handlers.begin) handlers.begin(g, ev);
    }
    if (handlers.move) handlers.move(g, ev);
    if (ev.cancelable) ev.preventDefault();
  };

  const up = (ev) => {
    if (!g || (ev && ev.pointerId !== g.id)) return;
    const done = g;
    reset();
    try {
      if (ev) el.releasePointerCapture(done.id);
    } catch (_) {}
    if (done.began) {
      if (handlers.end) handlers.end(done, ev);
    } else if (handlers.tap) {
      handlers.tap(done, ev);
    }
  };

  el.addEventListener('pointerdown', down);
  el.addEventListener('pointermove', move);
  el.addEventListener('pointerup', up);
  el.addEventListener('pointercancel', up);
  el.addEventListener('lostpointercapture', () => {
    if (g && g.began) up({ pointerId: g.id });
  });

  return () => {
    el.removeEventListener('pointerdown', down);
    el.removeEventListener('pointermove', move);
    el.removeEventListener('pointerup', up);
    el.removeEventListener('pointercancel', up);
  };
}

/**
 * Anima uma propriedade até um valor com a curva do iOS. Devolve uma
 * promessa para encadear (fechar a app depois de a animação acabar).
 */
export function springTo(el, from, to, apply, duration = 380) {
  return new Promise((resolve) => {
    const reduce = document.documentElement.getAttribute('data-motion') === 'off';
    if (reduce) {
      apply(to);
      resolve();
      return;
    }
    const t0 = performance.now();
    const ease = (t) => 1 - Math.pow(1 - t, 3.2);
    const step = (now) => {
      const p = Math.min(1, (now - t0) / duration);
      apply(from + (to - from) * ease(p));
      if (p < 1) requestAnimationFrame(step);
      else resolve();
    };
    requestAnimationFrame(step);
  });
}
