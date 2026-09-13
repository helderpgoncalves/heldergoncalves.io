// ─────────────────────────────────────────────────────────────────────
// Reordenar ícones: o motor, partilhado pela Dock do Mac e pelo ecrã
// inicial do telefone.
//
// O movimento é **FLIP**, e é ele que faz a diferença entre um refluxo
// suave e uma fila aos saltos:
//
//   1. mede-se onde cada ícone está agora (First);
//   2. aplica-se a ordem nova ao DOM e mede-se outra vez (Last);
//   3. cada um recebe a diferença como transformação, sem transição —
//      fica onde estava, mas já no lugar novo (Invert);
//   4. liga-se a transição e põe-se a diferença a zero (Play).
//
// Animar `left`/`top` obrigava o browser a refazer o layout a cada
// quadro; uma transformação não lhe toca. Por isso a fila reflui a 60
// quadros por segundo mesmo com uma dúzia de ícones a mexer-se.
//
// O ícone na mão é a excepção: segue o dedo sem transição nenhuma, e a
// posição dele conta-se sempre a partir da **casa** — o sítio onde ele
// ficaria com o desvio a zero. É por isso que o passo 2 mede tudo: as
// casas medidas ali servem ao mesmo tempo para o refluxo e para saber
// onde o dedo está em relação a cada lugar.
//
// Quem decide *onde* um ícone pode ir é quem chama (`cfg.zona`), não
// este ficheiro: a Dock do Mac é uma fila só, e o telefone tem uma
// grelha e uma Dock que trocam ícones entre si.
//
// O gesto vem todo de `gesture.js`. Não se escreve `pointerdown` à mão:
// perdia-se a captura, o eixo, a velocidade e o elástico.
// ─────────────────────────────────────────────────────────────────────
import { track } from './gesture.js';
import { reducedMotion } from './state.js';

const PRESO = 'reordenar-preso';
const MOVER = 'reordenar-mover';

/** Quanto tempo a transição do refluxo dura, em milissegundos. */
const REFLUXO_MS = 240;

/**
 * Insere `el` na posição `i` de uma caixa que pode ter lá dentro mais
 * coisas que não são ícones — o separador e a Reciclagem, na Dock do
 * Mac. Por isso não se usa `appendChild` para o fim: usa-se o lugar a
 * seguir ao último ícone, que não é o mesmo sítio.
 */
export function inserir(caixa, el, outros, i) {
  if (i < outros.length) caixa.insertBefore(el, outros[i]);
  else if (outros.length) caixa.insertBefore(el, outros[outros.length - 1].nextSibling);
  else caixa.appendChild(el);
}

/**
 * O arrasto. `cfg`:
 *
 *   raiz    onde o gesto escuta (a Dock, o ecrã inicial)
 *   pegar   (ev) => o ícone debaixo do dedo, ou null para ignorar
 *   nos     () => todos os ícones que participam no refluxo
 *   zonas   () => [{ caixa, itens }] — as filas em jogo, agora
 *   zona    (zonas, centro) => a zona de destino, ou null para «fora»
 *   mover   (el, zona, i) => muda o DOM; o refluxo é tratado aqui
 *   pegou   (el) => antes de levantar o ícone
 *   largou  (el) => depois de o pousar: guardar e anunciar
 */
export function criarArrasto(cfg) {
  /** O ícone na mão. */
  let item = null;
  /** Onde o dedo pegou no ícone, em fracção do próprio ícone. */
  let fx = 0.5;
  let fy = 0.5;
  /** A casa de cada nó: onde ele fica com o desvio a zero. */
  let casas = new Map();
  let zonas = [];
  /** De onde este ícone partiu — para voltar ao sítio se sair da fila. */
  let origem = null;

  const zerar = (el) => {
    el.style.setProperty('--ox', '0px');
    el.style.setProperty('--oy', '0px');
  };

  const limpar = (el) => {
    el.classList.remove(MOVER);
    el.style.removeProperty('--ox');
    el.style.removeProperty('--oy');
    el.style.removeProperty('--lift');
  };

  /**
   * Depois de assentar, ninguém fica com transições penduradas: a
   * mudança de layout seguinte (rodar o ecrã, trocar os widgets) não
   * pode aparecer a deslizar por causa de um gesto que já acabou. Com
   * um ícone ainda na mão não se arruma nada — era tirar a animação aos
   * vizinhos a meio do refluxo.
   */
  let arrumar = 0;
  function agendarLimpeza() {
    clearTimeout(arrumar);
    arrumar = setTimeout(() => {
      if (item) return;
      cfg.nos().forEach(limpar);
    }, REFLUXO_MS + 60);
  }

  /** Em que zona e em que lugar está um nó neste momento. */
  function sitio(el) {
    for (const z of zonas) {
      const i = z.itens.indexOf(el);
      if (i >= 0) return { caixa: z.caixa, indice: i };
    }
    return null;
  }

  /** O FLIP. `mudar` é a alteração do DOM, ou nada se for só medir. */
  function refluir(mudar) {
    const nos = cfg.nos();
    const antes = new Map();
    nos.forEach((el) => antes.set(el, el.getBoundingClientRect()));

    // Com as transições desligadas e as transformações a zero, o que se
    // mede a seguir é a casa de cada um — e não um ponto a meio de uma
    // animação anterior que ainda ia a caminho. O ícone na mão guarda o
    // seu `--lift`: é o tamanho a que foi levantado.
    nos.forEach((el) => {
      el.classList.remove(MOVER);
      zerar(el);
      if (el !== item) el.style.removeProperty('--lift');
    });
    if (mudar) mudar();

    zonas = cfg.zonas().map((z) => Object.assign({}, z, { rect: z.caixa.getBoundingClientRect() }));
    casas = new Map();
    nos.forEach((el) => casas.set(el, el.getBoundingClientRect()));

    if (reducedMotion()) return;

    let mexeu = false;
    nos.forEach((el) => {
      if (el === item) return;
      const a = antes.get(el);
      const b = casas.get(el);
      // O tamanho entra no FLIP tal como a posição: na Dock do Mac a
      // ampliação desfaz-se no mesmo instante em que se pega num ícone,
      // e sem isto os vizinhos escorregavam para o lugar certo mas
      // encolhiam de um quadro para o outro — um estalo no meio de um
      // movimento suave, que é pior do que não haver movimento nenhum.
      const k = b.width ? a.width / b.width : 1;
      const escala = Math.abs(k - 1) >= 0.001;
      let dx = a.left - b.left;
      let dy = a.top - b.top;
      if (escala) {
        // Uma escala não roda à volta do canto: `.dock-item` cresce a
        // partir do chão da Dock. Desconta-se para onde a origem da
        // transformação empurra a caixa, senão o ícone acerta no
        // tamanho e falha o sítio por meia largura.
        const org = getComputedStyle(el).transformOrigin.split(' ');
        const px = parseFloat(org[0]) || 0;
        const py = parseFloat(org[1]) || 0;
        dx -= px * (1 - k);
        dy -= py * (1 - k);
      }
      if (!dx && !dy && !escala) return;
      el.style.setProperty('--ox', dx.toFixed(1) + 'px');
      el.style.setProperty('--oy', dy.toFixed(1) + 'px');
      if (escala) el.style.setProperty('--lift', k.toFixed(4));
      mexeu = true;
    });
    if (!mexeu) return;
    // Uma leitura forçada, para o browser ficar com o ponto de partida
    // antes de a transição entrar. Sem isto ele juntava as duas
    // escritas e não havia animação nenhuma.
    void cfg.raiz.offsetWidth;
    nos.forEach((el) => {
      if (el === item) return;
      el.classList.add(MOVER);
      zerar(el);
      el.style.setProperty('--lift', '1');
    });
    agendarLimpeza();
  }

  /** Põe o ícone debaixo do dedo, contado a partir da casa dele. */
  function seguir(g) {
    const casa = casas.get(item);
    if (!casa) return;
    item.style.setProperty('--ox', (g.x - fx * casa.width - casa.left).toFixed(1) + 'px');
    item.style.setProperty('--oy', (g.y - fy * casa.height - casa.top).toFixed(1) + 'px');
  }

  /**
   * O centro do ícone, não o dedo: é o ícone que decide de quem se
   * aproximou. Contar pelo dedo fazia a fila trocar de ordem conforme
   * o sítio onde se lhe tinha pegado, o que se sente como aleatório.
   */
  function centro(g) {
    const casa = casas.get(item);
    if (!casa) return { x: g.x, y: g.y };
    return { x: g.x + (0.5 - fx) * casa.width, y: g.y + (0.5 - fy) * casa.height };
  }

  /**
   * Em que lugar o ícone entra: o primeiro cujo centro já ficou para
   * trás, em ordem de leitura.
   *
   * Numa fila de uma linha só — a Dock, nos dois sistemas — a altura
   * não entra na conta. Se entrasse, levantar o ícone um pouco acima da
   * Dock enquanto se anda para a direita mandava-o para o princípio da
   * fila, porque passava a estar «acima de toda a gente». Numa grelha a
   * altura conta, e conta primeiro: é a ordem por que se lê.
   */
  function lugar(zona, c) {
    const outros = zona.itens.filter((el) => el !== item);
    if (!outros.length) return 0;
    const primeira = casas.get(outros[0]);
    const umaLinha = outros.every((el) => {
      const r = casas.get(el);
      return !r || !primeira || Math.abs(r.top - primeira.top) < r.height / 2;
    });
    for (let k = 0; k < outros.length; k++) {
      const r = casas.get(outros[k]);
      if (!r) continue;
      if (umaLinha) {
        if (c.x < r.left + r.width / 2) return k;
        continue;
      }
      if (c.y < r.top) return k;
      if (c.y <= r.bottom && c.x < r.left + r.width / 2) return k;
    }
    return outros.length;
  }

  /** Um clique vem sempre atrás de um arrasto: este é do gesto, não de abrir. */
  function engolirClique() {
    const parar = (ev) => {
      ev.preventDefault();
      ev.stopPropagation();
    };
    document.addEventListener('click', parar, { capture: true, once: true });
    setTimeout(() => document.removeEventListener('click', parar, true), 350);
  }

  track(
    cfg.raiz,
    {
      down: (g, ev) => {
        item = cfg.pegar(ev);
        if (!item) return;
        const r = item.getBoundingClientRect();
        fx = r.width ? (g.x - r.left) / r.width : 0.5;
        fy = r.height ? (g.y - r.top) / r.height : 0.5;
      },
      begin: (g) => {
        if (!item) return;
        item.classList.add(PRESO);
        document.documentElement.classList.add('reordenando');
        // `pegou` corre dentro do FLIP de propósito: no Mac é ele que
        // suspende a ampliação, e a fila a encolher tem de refluir como
        // qualquer outra mudança de ordem — não dar um salto.
        refluir(() => {
          if (cfg.pegou) cfg.pegou(item);
        });
        origem = sitio(item);
        seguir(g);
      },
      move: (g) => {
        if (!item) return;
        seguir(g);
        const c = centro(g);
        const zona = cfg.zona(zonas, c);
        // Fora de tudo: o ícone continua atrás do dedo, mas a fila volta
        // a como estava. Largar fora nunca apaga uma app — não há por
        // onde a pôr de volta, e uma app que desaparece é uma armadilha.
        const destino = zona
          ? { caixa: zona.caixa, indice: lugar(zona, c) }
          : origem;
        if (!destino) return;
        const actual = sitio(item);
        if (actual && actual.caixa === destino.caixa && actual.indice === destino.indice) return;
        const alvo = zonas.find((z) => z.caixa === destino.caixa);
        if (!alvo) return;
        refluir(() => cfg.mover(item, alvo, destino.indice));
        seguir(g);
      },
      end: () => {
        if (!item) return;
        const el = item;
        item = null;
        el.classList.remove(PRESO);
        el.classList.add(MOVER);
        zerar(el);
        // O tamanho a que foi levantado volta ao normal com o mesmo
        // movimento que o traz ao lugar: é tudo a mesma transformação.
        el.style.removeProperty('--lift');
        document.documentElement.classList.remove('reordenando');
        agendarLimpeza();
        if (cfg.largou) cfg.largou(el);
        engolirClique();
      },
      tap: () => {
        item = null;
      },
    },
    {
      threshold: cfg.limiar == null ? 6 : cfg.limiar,
      filter: (ev) => Boolean(cfg.pegar(ev)),
    }
  );

  return {
    /** Para um movimento sem dedo nenhum — o teclado — refluir na mesma. */
    refluir,
    /** De onde o ícone em arrasto partiu, para quem precisa de o repor. */
    origem: () => origem,
  };
}
