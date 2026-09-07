// A ilha dinâmica. Estica-se para dizer uma coisa e volta ao tamanho
// dela sozinha — não há como a fechar, porque no iPhone também não há.
const SHOW_FOR = 2600;

export function createIsland(ph) {
  const { island } = ph.els;
  let timer = 0;

  function notify(text) {
    if (!island) return;
    island.querySelector('.island-text').textContent = text;
    island.classList.add('wide');
    clearTimeout(timer);
    timer = setTimeout(() => island.classList.remove('wide'), SHOW_FOR);
  }

  return { notify };
}
