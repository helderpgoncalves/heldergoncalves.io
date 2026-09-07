// ─────────────────────────────────────────────────────────────────────
// A Dock.
//
// Três coisas: o ponto por baixo dos ícones das aplicações abertas, o
// salto de quem acaba de abrir, e a ampliação ao passar o rato. A
// ampliação é uma parábola — cresce depressa perto do cursor e apaga-se
// suavemente ao afastar-se — e não se liga ao toque, onde não há cursor
// nenhum para a justificar.
//
// Quem trata dos cliques é o encaminhador global (`[data-open]`), não a
// Dock: assim o mesmo clique funciona no Mac e no telefone.
// ─────────────────────────────────────────────────────────────────────
import { reducedMotion } from '../state.js';

const MAX_SCALE = 0.5; // meia vez maior, no ponto mais alto
const REACH = 2.6; // até onde o cursor se faz sentir, em larguras de ícone

export function createDock(desk) {
  const { dock } = desk.els;
  const items = () => [...dock.querySelectorAll('.dock-item')];

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
    item.classList.add('bouncing');
    setTimeout(() => item.classList.remove('bouncing'), 1300);
  }

  dock.addEventListener('pointermove', (ev) => {
    if (reducedMotion() || ev.pointerType === 'touch') return;
    items().forEach((el) => {
      const r = el.getBoundingClientRect();
      const d = Math.abs(ev.clientX - (r.left + r.width / 2));
      const t = Math.max(0, 1 - d / (r.width * REACH));
      el.style.setProperty('--s', (1 + MAX_SCALE * t * t).toFixed(3));
    });
  });
  dock.addEventListener('pointerleave', () => items().forEach((el) => el.style.setProperty('--s', '1')));

  const trash = dock.querySelector('[data-trash]');
  if (trash) trash.addEventListener('click', () => desk.dialogs.alert(desk.s.trash, desk.s.trashEmpty));

  return { sync, bounce, iconFor };
}
