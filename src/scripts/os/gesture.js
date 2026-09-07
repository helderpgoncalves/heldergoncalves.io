// Motor de gestos. Um sítio só para o que é difícil: capturar o
// ponteiro, travar o eixo, medir velocidade e decidir no fim entre
// completar o gesto ou voltar atrás. Tudo o que desliza no telefone
// passa por aqui — é o que separa "um site" de "um telemóvel".

/**
 * Para onde o dedo *ia*. Ao largar, o iOS não olha só para onde o dedo
 * estava — soma o embalo. É isto que faz a diferença entre um gesto que
 * obedece e um gesto que parece adivinhar.
 */
export const project = (velocity, ms = 110) => velocity * ms;

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
/** Engole o clique que o browser dispara a seguir a um gesto. */
function swallowNextClick() {
  let timer = 0;
  const swallow = (ev) => {
    ev.stopPropagation();
    ev.preventDefault();
    done();
  };
  const done = () => {
    clearTimeout(timer);
    window.removeEventListener('click', swallow, true);
  };
  window.addEventListener('click', swallow, true);
  timer = setTimeout(done, 320);
}

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

  // Os eventos de ponteiro chegam mais depressa do que o ecrã pinta.
  // Guardamos o último e aplicamos uma vez por frame: menos trabalho,
  // zero saltos.
  let queued = false;
  const flush = () => {
    queued = false;
    if (g && g.began && handlers.move) handlers.move(g);
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

      // Um dedo nunca anda em linha reta. Desistir do gesto ao primeiro
      // tremor no eixo errado é o que faz um deslize "não funcionar" de
      // vez em quando — por isso só se desiste quando o outro eixo ganha
      // com folga; enquanto estiver renhido, espera-se.
      if (opts.axis) {
        const mine = opts.axis === 'x' ? ax : ay;
        const other = opts.axis === 'x' ? ay : ax;
        if (other > mine * 1.3 && other > threshold * 1.5) {
          reset();
          return;
        }
        if (mine < threshold) return;
      }

      g.axis = ax > ay ? 'x' : 'y';
      g.began = true;
      // Enquanto o dedo arrasta, nada fica com ar de carregado.
      document.documentElement.classList.add('gesturing');
      try {
        el.setPointerCapture(g.id);
      } catch (_) {}
      if (handlers.begin) handlers.begin(g, ev);
    }
    if (!queued) {
      queued = true;
      requestAnimationFrame(flush);
    }
    if (ev.cancelable) ev.preventDefault();
  };

  const up = (ev) => {
    if (!g || (ev && ev.pointerId !== g.id)) return;
    const done = g;
    reset();
    document.documentElement.classList.remove('gesturing');
    try {
      if (ev) el.releasePointerCapture(done.id);
    } catch (_) {}
    if (done.began) {
      // Depois de um gesto não pode nascer um clique. Sem isto, deslizar
      // por cima de um ícone acabava a abrir a aplicação — que é como um
      // gesto bom parece um gesto partido.
      swallowNextClick();
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
 * Uma mola, como a do UIKit: `response` é o período natural em segundos
 * e `damping` a razão de amortecimento (1 é assentar sem ressalto).
 *
 * O que a distingue de uma curva de tempo é a velocidade inicial: parte
 * de `from` **com o embalo que o dedo trazia** (`v0`, em px/ms) e é a
 * física que decide o resto. É por isso que largar depressa e largar
 * devagar dão movimentos diferentes — como no telefone.
 *
 * Devolve uma promessa com `cancel()`, para um gesto novo poder
 * interromper o assentar do anterior.
 */
export function spring(from, to, v0, apply, opts = {}) {
  let frame = 0;
  const promise = new Promise((resolve) => {
    if (reduced()) {
      apply(to);
      resolve();
      return;
    }
    const response = opts.response || 0.42;
    const zeta = Math.min(1, opts.damping || 0.86);
    const w0 = (2 * Math.PI) / response;
    const d0 = from - to;
    const v = (v0 || 0) * 1000;
    const t0 = performance.now();

    // A solução analítica: sem integrar, sem acumular erro, e o quadro
    // que se perde não muda o sítio onde se acaba.
    let at;
    if (zeta < 1) {
      const wd = w0 * Math.sqrt(1 - zeta * zeta);
      const b = (v + zeta * w0 * d0) / wd;
      at = (t) => Math.exp(-zeta * w0 * t) * (d0 * Math.cos(wd * t) + b * Math.sin(wd * t));
    } else {
      const b = v + w0 * d0;
      at = (t) => (d0 + b * t) * Math.exp(-w0 * t);
    }

    const step = (now) => {
      const t = (now - t0) / 1000;
      const x = at(t);
      if ((Math.abs(x) < 0.1 && t > response / 2) || t > 2) {
        frame = 0;
        apply(to);
        resolve();
        return;
      }
      apply(to + x);
      frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
  });
  promise.cancel = () => {
    if (frame) cancelAnimationFrame(frame);
    frame = 0;
  };
  return promise;
}
