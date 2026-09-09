// Motor de gestos. Um sítio só para o que é difícil: capturar o
// ponteiro, travar o eixo, medir velocidade e decidir no fim entre
// completar o gesto ou voltar atrás. Tudo o que desliza no telefone
// passa por aqui — é o que separa "um site" de "um telemóvel".
//
// O transporte de baixo nível (pointer capture, um por dedo, o que
// cada browser faz de diferente) vem do @use-gesture/vanilla — o
// `setPointerCapture` escrito à mão perdia a captura a meio do gesto
// em alguns browsers e deixava o deslize entre páginas do ecrã
// inicial pelo caminho. A física por cima (elástico, mola, threshold
// por eixo) continua nossa: é o que dá o toque da Apple.
import { DragGesture } from '@use-gesture/vanilla';
import { reducedMotion } from './state.js';

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
export function track(el, handlers, opts = {}) {
  const threshold = opts.threshold == null ? 8 : opts.threshold;
  let g = null;
  let began = false;

  const gesture = new DragGesture(
    el,
    (state) => {
      const ev = state.event;
      if (opts.filter && state.first && !opts.filter(ev)) {
        state.cancel();
        return;
      }

      if (state.first) {
        began = false;
        g = {
          x0: state.xy[0] - state.movement[0],
          y0: state.xy[1] - state.movement[1],
          x: state.xy[0],
          y: state.xy[1],
          dx: 0,
          dy: 0,
          vx: 0,
          vy: 0,
          axis: null,
          began: false,
        };
        if (handlers.down) handlers.down(g, ev);
      }
      if (!g) return;

      g.x = state.xy[0];
      g.y = state.xy[1];
      g.dx = state.movement[0];
      g.dy = state.movement[1];
      // A lib dá velocidade sem sinal (px/ms) e a direção à parte — e no
      // frame final (soltar o dedo) zera as duas. O embalo para o
      // `project()` tem de vir do último frame com o dedo ainda a mexer,
      // senão um flick rápido perdia a velocidade mesmo antes de chegar
      // ao `end()`.
      if (!state.last) {
        g.vx = (state.velocity[0] || 0) * (state.direction[0] || 0);
        g.vy = (state.velocity[1] || 0) * (state.direction[1] || 0);
      }

      if (!began) {
        const ax = Math.abs(g.dx);
        const ay = Math.abs(g.dy);
        if (Math.max(ax, ay) < threshold) {
          if (state.last) finishAsTap(ev);
          return;
        }

        // Um dedo nunca anda em linha reta. Desistir do gesto ao primeiro
        // tremor no eixo errado é o que faz um deslize "não funcionar" de
        // vez em quando — por isso só se desiste quando o outro eixo ganha
        // com folga; enquanto estiver renhido, espera-se.
        if (opts.axis) {
          const mine = opts.axis === 'x' ? ax : ay;
          const other = opts.axis === 'x' ? ay : ax;
          if (other > mine * 1.3 && other > threshold * 1.5) {
            g = null;
            return;
          }
          if (mine < threshold) {
            if (state.last) finishAsTap(ev);
            return;
          }
        }

        g.axis = ax > ay ? 'x' : 'y';
        g.began = true;
        began = true;
        document.documentElement.classList.add('gesturing');
        if (handlers.begin) handlers.begin(g, ev);
      }

      if (handlers.move) handlers.move(g);

      if (state.last) {
        document.documentElement.classList.remove('gesturing');
        if (began && handlers.end) handlers.end(g, ev);
        g = null;
        began = false;
      }
    },
    {}
  );

  function finishAsTap(ev) {
    document.documentElement.classList.remove('gesturing');
    if (handlers.tap) handlers.tap(g, ev);
    g = null;
    began = false;
  }

  return () => gesture.destroy();
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
    if (reducedMotion()) {
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
