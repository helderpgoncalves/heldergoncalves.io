// ─────────────────────────────────────────────────────────────────────
// A ordem da Dock do Mac.
//
// Na Dock a sério não há modo nenhum: pega-se num ícone e arrasta-se, e
// os vizinhos afastam-se para abrir lugar. É assim aqui — o modo de
// edição é coisa do telefone.
//
// Duas decisões que não são detalhe:
//
// **A ampliação fica suspensa durante o arrasto.** As duas coisas
// escrevem no mesmo sítio (a transformação do ícone) e, à solta ao
// mesmo tempo, lutam pelo mesmo ícone: o ponteiro passa por cima do
// vizinho, a ampliação estica a fila, as casas medidas deixam de valer
// e a fila treme. Suspende-se ao pegar e volta ao largar.
//
// **Largar fora da Dock não remove nada.** O macOS remove — mas o
// macOS também tem por onde voltar a pôr, e aqui não há. Uma app que
// desaparece sem volta é uma armadilha, por isso sair da fila só faz o
// ícone voltar ao sítio de onde partiu.
//
// A geometria da ampliação e o ciclo de quadros continuam em `dock.js`;
// aqui só se lhe pede para parar e para continuar.
// ─────────────────────────────────────────────────────────────────────
import { criarArrasto, inserir } from '../reordenar.js';
import { porOrdem, idsDe, anunciar, preencher } from '../ordem.js';
import { prefs, setPref } from '../state.js';
import { clamp } from '../gesture.js';

export function ordenarDock(desk) {
  const { dock } = desk.els;
  const s = desk.s.reordenar;
  if (!dock) return;

  /** Os que se reordenam. A Reciclagem fica onde está, como no macOS. */
  const itens = () => [...dock.querySelectorAll('.dock-item[data-open]')];
  /** Os que refluem — a Reciclagem também encolhe quando a fila relaxa. */
  const todos = () => [...dock.querySelectorAll('.dock-item')];
  const nome = (el) => (desk.meta(el.dataset.open) || {}).name || el.dataset.open;

  // ── A ordem guardada ───────────────────────────────────────────────
  // Antes de a Dock ser medida pela primeira vez: a ampliação conta com
  // a fila que está no DOM, e reordenar depois obrigava-a a remedir.
  (function aplicarGuardada() {
    const fim = dock.querySelector('.dock-sep') || dock.querySelector('[data-trash]');
    porOrdem(itens(), prefs.dockOrder).forEach((el) => dock.insertBefore(el, fim));
  })();

  function guardar(el, dito) {
    const lista = itens();
    setPref('dockOrder', idsDe(lista));
    if (!dito) return;
    anunciar(preencher(s.moved, { app: nome(el), n: lista.indexOf(el) + 1, total: lista.length }));
  }

  // ── Arrastar ───────────────────────────────────────────────────────
  const arrasto = criarArrasto({
    raiz: dock,
    pegar: (ev) => (ev.target.closest ? ev.target.closest('.dock-item[data-open]') : null),
    nos: todos,
    zonas: () => [{ caixa: dock, itens: itens() }],
    // A folga é de uma altura de ícone à volta: uma mão a arrastar nunca
    // anda em linha recta, e desistir ao primeiro desvio dava a
    // sensação de a Dock largar o ícone sem razão.
    zona: (zonas, c) => {
      const z = zonas[0];
      if (!z) return null;
      const r = z.rect;
      const folga = r.height || 60;
      const dentro =
        c.x > r.left - folga && c.x < r.right + folga && c.y > r.top - folga && c.y < r.bottom + folga;
      return dentro ? z : null;
    },
    mover: (el, zona, i) => inserir(dock, el, zona.itens.filter((n) => n !== el), i),
    // O ícone fica com o tamanho a que a ampliação já o tinha posto —
    // é o que a Dock a sério faz, e é o que impede um estalo no
    // instante em que se pega nele. Só se levanta um pouco quando
    // estava em repouso (rato parado, ou movimento reduzido).
    pegou: (el) => {
      const escala = parseFloat(getComputedStyle(el).getPropertyValue('--s')) || 1;
      el.style.setProperty('--lift', String(Math.max(1.08, escala)));
      desk.dock.pausar();
    },
    largou: (el) => {
      desk.dock.retomar();
      guardar(el, true);
    },
  });

  // ── Teclado ────────────────────────────────────────────────────────
  // Um ícone com foco move-se com Option e as setas. Sem isto, reordenar
  // era um gesto só para quem vê e aponta — e um gesto assim não está
  // feito. O `preventDefault` também serve para o Option‑seta não ir
  // navegar no histórico do browser.
  dock.addEventListener('keydown', (ev) => {
    if (!ev.altKey || ev.metaKey || ev.ctrlKey) return;
    const passo = ev.key === 'ArrowLeft' ? -1 : ev.key === 'ArrowRight' ? 1 : 0;
    if (!passo) return;
    const el = ev.target.closest && ev.target.closest('.dock-item[data-open]');
    if (!el) return;
    ev.preventDefault();
    const lista = itens();
    const de = lista.indexOf(el);
    const para = clamp(de + passo, 0, lista.length - 1);
    if (para === de) return;
    desk.dock.pausar();
    arrasto.refluir(() => inserir(dock, el, lista.filter((n) => n !== el), para));
    desk.dock.retomar();
    // Mover um nó no DOM pode fazer-lhe perder o foco: quem está a
    // arrumar a Dock com as setas não pode ficar sem o ícone debaixo do
    // teclado a meio da arrumação.
    el.focus({ preventScroll: true });
    guardar(el, true);
  });

  // A primeira vez que um ícone da Dock recebe foco, diz-se como é que
  // ele se move. Depois disso cala-se: repetir a cada foco era ruído.
  let dita = false;
  dock.addEventListener(
    'focusin',
    (ev) => {
      if (dita || !ev.target.closest('.dock-item[data-open]')) return;
      dita = true;
      anunciar(s.hint);
    },
    true
  );
}
