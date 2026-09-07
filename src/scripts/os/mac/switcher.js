// ─────────────────────────────────────────────────────────────────────
// ⌘Tab.
//
// A ordem é a das janelas ao contrário — a mais recente primeiro — e o
// primeiro passo cai já na segunda, que é o que faz o ⌘Tab servir para
// saltar entre as duas últimas sem pensar. Larga-se o ⌘ e activa-se.
// ─────────────────────────────────────────────────────────────────────
import { esc } from '../lib/dom.js';

export function createSwitcher(desk) {
  const { ctx, wins, els } = desk;

  let el = null;
  let index = 0;
  let order = [];

  function mark() {
    if (!el) return;
    [...el.children].forEach((child, i) => child.classList.toggle('on', i === index));
  }

  function open() {
    order = [...wins.keys()].reverse();
    if (order.length < 2) return false;
    index = 1;
    if (!el) {
      el = document.createElement('div');
      el.className = 'cmdtab glass';
      els.root.appendChild(el);
      if (ctx.addGlass) ctx.addGlass(el);
    }
    el.innerHTML = order
      .map(
        (id) =>
          '<button class="cmdtab-item" type="button" data-id="' +
          esc(id) +
          '"><svg viewBox="0 0 100 100" aria-hidden="true"><use href="#icon-' +
          esc(id) +
          '"/></svg><span>' +
          esc(desk.meta(id).name) +
          '</span></button>'
      )
      .join('');
    el.addEventListener('click', (ev) => {
      const b = ev.target.closest('[data-id]');
      if (b) {
        close();
        desk.windows.open(b.dataset.id);
      }
    });
    mark();
    return true;
  }

  function step(back) {
    if (!el) return;
    index = (index + (back ? -1 : 1) + order.length) % order.length;
    mark();
  }

  function close(activate) {
    if (!el) return;
    const id = order[index];
    el.remove();
    el = null;
    if (activate && id) desk.windows.open(id);
  }

  return { open, step, close, isOpen: () => !!el };
}
