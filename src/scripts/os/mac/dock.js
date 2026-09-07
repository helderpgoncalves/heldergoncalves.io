// ─────────────────────────────────────────────────────────────────────
// A Dock.
//
// A ampliação do macOS é uma conta em três passos, e é por saltar um
// deles que quase todas as imitações se denunciam:
//
//   1. Cada ícone cresce conforme a distância ao cursor, com uma janela
//      de cosseno — sobe e desce sem cantos, ao contrário de uma
//      parábola, que tem um joelho onde acaba o alcance.
//   2. Os ícones são postos lado a lado **já com o tamanho novo**, cada
//      um a seguir ao anterior. É isso que abre lugar aos vizinhos: não
//      há empurrão nenhum, há uma fila que ficou mais comprida.
//   3. A Dock alarga para caber a fila. Como está centrada no ecrã,
//      alarga para os dois lados por igual.
//
// E entre um quadro e o seguinte nada salta: cada ícone aproxima-se do
// tamanho que devia ter numa fracção do caminho por quadro, a mesma em
// qualquer ecrã porque é contada em tempo e não em quadros.
//
// A posição do cursor é convertida para o referencial da Dock em
// repouso *através da fila actual*: assim o ícone maior é sempre o que
// está mesmo debaixo do cursor, mesmo com a fila esticada.
//
// Quem trata dos cliques é o encaminhador global (`[data-open]`), não a
// Dock: assim o mesmo clique funciona no Mac e no telefone.
// ─────────────────────────────────────────────────────────────────────
import { reducedMotion } from '../state.js';

/** A escala do ícone debaixo do cursor. */
const MAX_SCALE = 1.8;

/** A largura da zona que o cursor afecta, em larguras de ícone. */
const REACH = 4.7;

/** Constantes de tempo da suavização: a seguir o cursor, e a largar. */
const FOLLOW_MS = 70;
const RELEASE_MS = 120;

/** Abaixo disto, chegou. */
const SETTLED = 0.002;

export function createDock(desk) {
  const { dock } = desk.els;

  /** O ícone de uma aplicação, para as janelas nascerem e voltarem a ele. */
  const iconFor = (id) => dock.querySelector(`[data-open="${id}"] svg`);

  /** Acende o ponto por baixo do que está aberto. */
  function sync() {
    dock.querySelectorAll('[data-open]').forEach((el) => {
      el.classList.toggle('running', desk.wins.has(el.dataset.open));
    });
  }

  function bounce(id) {
    if (reducedMotion()) return;
    const item = dock.querySelector(`[data-open="${id}"]`);
    if (!item) return;
    item.classList.remove('bouncing');
    void item.offsetWidth;
    item.classList.add('bouncing');
    item.addEventListener('animationend', () => item.classList.remove('bouncing'), { once: true });
  }

  // ── A geometria ────────────────────────────────────────────────────

  /**
   * As peças da fila. Um `.dock-item` cresce; o separador não, mas
   * ocupa lugar e leva a folga dos dois lados como toda a gente.
   */
  let row = [];
  let base = 0;
  let pad = 0;
  let gap = 0;
  let natural = 0;

  function measure() {
    // A folga e a margem vêm do CSS, para a conta e o desenho baterem
    // certo ao píxel; o tamanho do ícone é o que ele mede em repouso —
    // `offsetWidth` ignora a transformação.
    const cs = getComputedStyle(dock);
    gap = parseFloat(cs.columnGap) || 0;
    pad = parseFloat(cs.paddingLeft) || 0;
    const first = dock.querySelector('.dock-item');
    base = (first && first.offsetWidth) || 52;
    let x = 0;
    row = [...dock.children].map((el) => {
      const grows = el.classList.contains('dock-item');
      const width = grows ? base : el.offsetWidth || 1;
      const item = { el, grows, width, rest: x + width / 2, centre: x + width / 2, scale: 1, target: 1 };
      x += width + gap;
      return item;
    });
    natural = Math.max(0, x - gap);
  }

  /** A janela de cosseno: 1 debaixo do cursor, 0 no limite, sem cantos. */
  function scaleAt(distance) {
    const half = (base * REACH) / 2;
    if (distance >= half) return 1;
    return 1 + ((MAX_SCALE - 1) * (1 + Math.cos((Math.PI * distance) / half))) / 2;
  }

  /**
   * Do ecrã para o referencial em repouso, pela fila actual: entre dois
   * centros vizinhos a conversão é linear, e fora da fila é a identidade.
   */
  function toRest(x) {
    if (!row.length) return x;
    if (x <= row[0].centre) return row[0].rest + (x - row[0].centre);
    for (let i = 1; i < row.length; i++) {
      const a = row[i - 1];
      const b = row[i];
      if (x <= b.centre) {
        const t = (x - a.centre) / (b.centre - a.centre || 1);
        return a.rest + (b.rest - a.rest) * t;
      }
    }
    const last = row[row.length - 1];
    return last.rest + (x - last.centre);
  }

  function retarget(cursor) {
    row.forEach((item) => {
      item.target = item.grows && cursor != null ? scaleAt(Math.abs(cursor - item.rest)) : 1;
    });
  }

  /** Põe a fila lado a lado com as escalas actuais e escreve-a no DOM. */
  function layout() {
    let x = 0;
    row.forEach((item) => {
      const w = item.width * item.scale;
      item.centre = x + w / 2;
      x += w + gap;
    });
    const width = Math.max(0, x - gap);
    row.forEach((item) => {
      if (!item.grows) return;
      item.el.style.setProperty('--dx', (item.centre - item.rest).toFixed(2) + 'px');
      item.el.style.setProperty('--s', item.scale.toFixed(4));
      item.el.style.zIndex = String(Math.round(item.scale * 10));
    });
    dock.style.width = width > natural + 0.5 ? width + pad * 2 + 'px' : '';
  }

  // ── O ciclo ────────────────────────────────────────────────────────
  let cursor = null;
  let frame = 0;
  let last = 0;

  function step(now) {
    frame = 0;
    const dt = Math.min(48, now - last || 16);
    last = now;
    const k = 1 - Math.exp(-dt / (cursor == null ? RELEASE_MS : FOLLOW_MS));
    let moving = false;
    row.forEach((item) => {
      const diff = item.target - item.scale;
      if (Math.abs(diff) < SETTLED) item.scale = item.target;
      else {
        item.scale += diff * k;
        moving = true;
      }
    });
    layout();
    if (moving || cursor != null) frame = requestAnimationFrame(step);
  }

  function run() {
    if (!frame) {
      last = performance.now();
      frame = requestAnimationFrame(step);
    }
  }

  function relax() {
    cursor = null;
    retarget(null);
    run();
  }

  /** A largura da fila tal como está agora. */
  function rowWidth() {
    const l = row[row.length - 1];
    return l ? l.centre + (l.width * l.scale) / 2 : 0;
  }

  /** Onde a fila começa no ecrã: a Dock está centrada, e a fila nela. */
  function rowLeft() {
    const r = dock.getBoundingClientRect();
    return r.left + r.width / 2 - rowWidth() / 2;
  }

  dock.addEventListener('pointerenter', (ev) => {
    if (reducedMotion() || ev.pointerType === 'touch') return;
    // Só se não houver medida: a fila pode ainda estar a assentar de uma
    // saída há um instante, e medir agora punha-a a saltar.
    if (!row.length) measure();
  });

  dock.addEventListener('pointermove', (ev) => {
    if (reducedMotion() || ev.pointerType === 'touch') return;
    if (!row.length) measure();
    cursor = toRest(ev.clientX - rowLeft());
    retarget(cursor);
    run();
  });

  dock.addEventListener('pointerleave', relax);

  // Se o ecrã mudar de tamanho, a medida anterior deixou de valer.
  window.addEventListener('resize', () => {
    row = [];
    dock.style.width = '';
  });

  const trash = dock.querySelector('[data-trash]');
  if (trash) trash.addEventListener('click', () => desk.dialogs.alert(desk.s.trash, desk.s.trashEmpty));

  return { sync, bounce, iconFor };
}
