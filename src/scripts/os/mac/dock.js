// ─────────────────────────────────────────────────────────────────────
// A Dock.
//
// A ampliação do macOS faz duas coisas ao mesmo tempo, e é por só fazer
// a primeira que quase todas as imitações se denunciam: os ícones perto
// do cursor **crescem**, e os que estão à volta **afastam-se** para lhes
// dar lugar. Sem a segunda, os ícones ampliados entram uns pelos outros
// e a Dock parece esmagada.
//
// Aqui a conta é a mesma dos dois lados. Para cada ícone calcula-se a
// escala a partir da distância ao cursor, com uma janela de cosseno —
// que sobe e desce sem cantos, ao contrário de uma parábola, que tem um
// joelho onde acaba o alcance. Depois, para cada ícone, soma-se a
// largura extra de todos os que estão entre ele e o cursor: é isso, e
// só isso, que o empurra para fora.
//
// Quem trata dos cliques é o encaminhador global (`[data-open]`), não a
// Dock: assim o mesmo clique funciona no Mac e no telefone.
// ─────────────────────────────────────────────────────────────────────
import { reducedMotion } from '../state.js';

/** Quanto o ícone debaixo do cursor cresce, por cima do seu tamanho. */
const MAX_GROWTH = 0.9;

/** Até onde o cursor se faz sentir, em larguras de ícone. */
const REACH = 2.4;

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

  /**
   * A janela de cosseno: 1 debaixo do cursor, 0 no limite do alcance, e
   * nem um canto pelo caminho. `u` é a distância normalizada.
   */
  const falloff = (u) => (u >= 1 ? 0 : (Math.cos(u * Math.PI) + 1) / 2);

  function relax() {
    items().forEach((el) => {
      el.style.setProperty('--s', '1');
      el.style.setProperty('--dx', '0px');
    });
  }

  /**
   * A geometria em repouso, medida uma vez ao entrar na Dock.
   *
   * Tem de ser em repouso: `getBoundingClientRect` devolve a caixa já
   * transformada, por isso medir a meio da ampliação e realimentar a
   * conta com esse valor punha a Dock a tremer sozinha.
   */
  let geom = null;

  const measure = () =>
    items().map((el) => {
      const r = el.getBoundingClientRect();
      return { el, centre: r.left + r.width / 2, base: r.width };
    });

  function magnify(clientX) {
    if (!geom) geom = measure();
    const boxes = geom;
    if (!boxes.length) return;

    // 1. Quanto cada um cresce.
    const reach = boxes[0].base * REACH;
    boxes.forEach((b) => {
      b.scale = 1 + MAX_GROWTH * falloff(Math.abs(clientX - b.centre) / reach);
      b.extra = (b.scale - 1) * b.base;
    });

    // 2. Quem está mais perto do cursor fica onde está; os outros
    //    afastam-se dele, cada um pela largura extra do que ficou pelo
    //    caminho. Meia de cada, porque cada ícone cresce a partir do seu
    //    próprio centro.
    let anchor = 0;
    boxes.forEach((b, i) => {
      if (Math.abs(clientX - b.centre) < Math.abs(clientX - boxes[anchor].centre)) anchor = i;
    });
    boxes[anchor].shift = 0;

    let acc = 0;
    for (let i = anchor + 1; i < boxes.length; i++) {
      acc += boxes[i - 1].extra / 2 + boxes[i].extra / 2;
      boxes[i].shift = acc;
    }
    acc = 0;
    for (let i = anchor - 1; i >= 0; i--) {
      acc -= boxes[i + 1].extra / 2 + boxes[i].extra / 2;
      boxes[i].shift = acc;
    }

    boxes.forEach((b) => {
      b.el.style.setProperty('--s', b.scale.toFixed(3));
      b.el.style.setProperty('--dx', b.shift.toFixed(2) + 'px');
    });
  }

  // Um pedido de quadro por movimento, e não uma escrita por evento: o
  // rato dispara mais vezes do que o ecrã pinta.
  let pending = 0;

  dock.addEventListener('pointerenter', (ev) => {
    if (reducedMotion() || ev.pointerType === 'touch') return;
    geom = measure();
  });

  dock.addEventListener('pointermove', (ev) => {
    if (reducedMotion() || ev.pointerType === 'touch') return;
    const x = ev.clientX;
    if (pending) return;
    pending = requestAnimationFrame(() => {
      pending = 0;
      magnify(x);
    });
  });

  dock.addEventListener('pointerleave', () => {
    if (pending) cancelAnimationFrame(pending);
    pending = 0;
    geom = null;
    relax();
  });

  // Se o ecrã mudar de tamanho, a medida anterior deixou de valer.
  window.addEventListener('resize', () => {
    geom = null;
  });

  const trash = dock.querySelector('[data-trash]');
  if (trash) trash.addEventListener('click', () => desk.dialogs.alert(desk.s.trash, desk.s.trashEmpty));

  return { sync, bounce, iconFor };
}
