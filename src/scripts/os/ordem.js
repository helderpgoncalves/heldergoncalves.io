// ─────────────────────────────────────────────────────────────────────
// A ordem dos ícones: onde fica guardada, e como se lê de volta.
//
// Três listas de ids de aplicação, nas preferências (`state.js`), ao
// lado do tema e do papel de parede: `dockOrder` (a Dock do Mac),
// `iosOrder` (o ecrã inicial do telefone, ao longo de todas as páginas)
// e `iosDockOrder` (a Dock do telefone). É por dispositivo, vive no
// `localStorage`, e nunca vai ao servidor — a ordem por que alguém gosta
// de ter os ícones é conveniência de quem está a ver, não é um dado.
//
// A regra que justifica este ficheiro existir é o `porOrdem()`: uma
// aplicação que a lista guardada não conhece **vai para o fim, não
// desaparece**. No dia em que nascer uma app nova, quem já tinha uma
// ordem sua tem de a ver na mesma, com a nova ao fundo. Uma lista
// guardada usada como se fosse a lista toda é o erro clássico deste
// tipo de funcionalidade: as apps que ela não menciona somem-se.
// ─────────────────────────────────────────────────────────────────────

/** Os ids, pela ordem em que os nós estão agora. */
export const idsDe = (nos) => nos.map((el) => el.dataset.open);

/**
 * Os nós reordenados segundo uma lista guardada de ids. O que a lista
 * não conhece fica no fim, pela ordem com que o HTML o trouxe; o que a
 * lista menciona e já não existe é ignorado sem ruído.
 */
export function porOrdem(nos, guardada) {
  if (!Array.isArray(guardada) || !guardada.length) return nos.slice();
  const porId = new Map();
  nos.forEach((el) => porId.set(el.dataset.open, el));
  const feitos = [];
  guardada.forEach((id) => {
    const el = porId.get(id);
    if (el && !feitos.includes(el)) feitos.push(el);
  });
  nos.forEach((el) => {
    if (!feitos.includes(el)) feitos.push(el);
  });
  return feitos;
}

/** `'{app}: posição {n}'` com os valores lá dentro. */
export const preencher = (molde, valores) =>
  String(molde || '').replace(/\{(\w+)\}/g, (_, chave) => (valores[chave] == null ? '' : String(valores[chave])));

// ── O que se diz a quem não vê ────────────────────────────────────────
// Reordenar com o dedo é um gesto; reordenar com o teclado é um gesto
// que não tem imagem nenhuma. Sem isto, quem move um ícone com as setas
// não fica a saber para onde ele foi — e uma funcionalidade que só
// existe para quem vê e aponta não está feita.

let regiao = null;
let porDizer = 0;

export function anunciar(texto) {
  if (!texto) return;
  if (!regiao) regiao = document.getElementById('anuncio');
  if (!regiao) return;
  // Um leitor de ecrã não relê um texto igual ao que já lá está: por
  // isso esvazia-se primeiro e escreve-se no tempo seguinte. Mover dois
  // ícones seguidos para a mesma posição tem de ser lido duas vezes.
  clearTimeout(porDizer);
  regiao.textContent = '';
  porDizer = setTimeout(() => {
    if (regiao) regiao.textContent = texto;
  }, 50);
}
