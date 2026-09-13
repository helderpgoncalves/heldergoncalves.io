// ─────────────────────────────────────────────────────────────────────
// Reordenar o ecrã inicial do telefone.
//
// Só em modo de edição — o mesmo que já existe (`widgets.js`: os ícones
// tremem, aparece o «+» e cada widget ganha o seu «−»), a que se chega
// por toque longo. **Não há um segundo modo**: dois modos de edição no
// mesmo ecrã são um bug à espera de acontecer, e além disso quem já
// segurou o dedo para mexer nos widgets espera mexer também nos ícones.
//
// Duas caixas em jogo: a grelha da página à vista e a Dock. Arrasta-se
// de uma para a outra nos dois sentidos. A Dock tem **quatro lugares**,
// como no iPhone; com ela cheia, o que se larga lá troca com o último,
// que vai ocupar o lugar de onde o outro veio. Recusar em silêncio era
// deixar o dedo sem resposta nenhuma.
//
// Os nós movem-se, não se voltam a desenhar: o badge vermelho e o
// `aria-label` que `badges.js` pinta dentro de cada `.sb-app` vinham
// abaixo com o HTML se isto recriasse os ícones.
// ─────────────────────────────────────────────────────────────────────
import { criarArrasto, inserir } from '../reordenar.js';
import { idsDe, anunciar, preencher } from '../ordem.js';
import { prefs, setPref } from '../state.js';
import { clamp } from '../gesture.js';

/** Os lugares da Dock do iPhone. Não são negociáveis. */
const MAX = 4;

/** Colunas da grelha — o que uma seta para cima ou para baixo anda. */
const COLS = 4;

export function criarOrdenar(ph) {
  const sb = ph.els.sb;
  const pages = ph.els.pages;
  const dock = sb && sb.querySelector('.ios-dock');
  const s = ph.s.reordenar;
  if (!sb || !pages || !dock) return;

  const editar = () => Boolean(ph.ctx.widgets && ph.ctx.widgets.editing());
  const naCaixa = (caixa) => (caixa ? [...caixa.querySelectorAll('.sb-app')] : []);
  const naGrelhaToda = () => [...pages.querySelectorAll('.sb-app')];
  const nome = (el) => (ph.meta(el.dataset.open) || {}).name || el.dataset.open;

  /** A grelha da página à vista — é nela que se reordena. */
  function grelha() {
    const pg = pages.children[ph.pages.current()];
    return (pg && pg.querySelector('.sb-grid')) || pages.querySelector('.sb-grid');
  }

  // ── A ordem guardada ───────────────────────────────────────────────
  (function aplicarGuardada() {
    const g = pages.querySelector('.sb-grid');
    const naDockGuardada = Array.isArray(prefs.iosDockOrder) ? prefs.iosDockOrder : null;
    const naGrelhaGuardada = Array.isArray(prefs.iosOrder) ? prefs.iosOrder : null;
    if (!g || (!naDockGuardada && !naGrelhaGuardada)) return;

    const todos = [...sb.querySelectorAll('.sb-app')];
    const porId = new Map(todos.map((el) => [el.dataset.open, el]));
    const conhecida = new Set([].concat(naDockGuardada || [], naGrelhaGuardada || []));
    const escolher = (ids) => {
      const feitos = [];
      (ids || []).forEach((id) => {
        const el = porId.get(id);
        if (el && !feitos.includes(el)) feitos.push(el);
      });
      return feitos;
    };

    // O que a memória não conhece fica na caixa que o HTML lhe deu, no
    // fim dela: uma app nascida hoje aparece na mesma a quem já tinha
    // uma ordem sua, em vez de desaparecer sem explicação.
    const novosDock = todos.filter((el) => !conhecida.has(el.dataset.open) && dock.contains(el));
    const novosGrelha = todos.filter((el) => !conhecida.has(el.dataset.open) && !dock.contains(el));

    let naDock = escolher(naDockGuardada).concat(novosDock);
    let naGrelha = escolher(naGrelhaGuardada)
      .filter((el) => !naDock.includes(el))
      .concat(novosGrelha);
    // Quatro lugares, nem mais: o que sobrar vai para o fim do ecrã inicial.
    if (naDock.length > MAX) naGrelha = naGrelha.concat(naDock.slice(MAX));
    naDock = naDock.slice(0, MAX);

    naDock.forEach((el) => dock.appendChild(el));
    // Tudo para a primeira grelha; é o `reflow()` que sabe quantas
    // linhas cabem em cada página depois dos widgets escolhidos.
    naGrelha.forEach((el) => g.appendChild(el));
    ph.pages.reflow();
  })();

  // ── Guardar e anunciar ─────────────────────────────────────────────
  function guardar(el, dito) {
    setPref('iosDockOrder', idsDe(naCaixa(dock)));
    setPref('iosOrder', idsDe(naGrelhaToda()));
    if (!dito || !el) return;
    const naDock = dock.contains(el);
    const lista = naDock ? naCaixa(dock) : naGrelhaToda();
    anunciar(
      preencher(naDock ? s.dock : s.home, {
        app: nome(el),
        n: lista.indexOf(el) + 1,
        total: lista.length,
      })
    );
  }

  // ── Arrastar ───────────────────────────────────────────────────────
  /** O ícone que a Dock cheia empurrou para fora, enquanto o gesto dura. */
  let deslocado = null;
  /** Se o ícone que está na mão partiu da Dock ou da grelha. */
  let partiuDaDock = false;

  function mover(el, zona, i) {
    // A conta faz-se sempre a partir do repouso: o que tinha saído da
    // Dock volta primeiro, e só depois se decide quem sai desta vez.
    // Sem isto, dois passos pela Dock deixavam dois ícones de fora.
    if (deslocado) {
      dock.appendChild(deslocado);
      deslocado = null;
    }
    const caixa = zona.caixa;
    const outros = naCaixa(caixa).filter((n) => n !== el);
    if (caixa === dock && outros.length >= MAX) {
      deslocado = outros.pop();
      const casa = arrasto.origem();
      const g = grelha();
      if (g) {
        const vizinhos = naCaixa(g).filter((n) => n !== deslocado && n !== el);
        inserir(g, deslocado, vizinhos, clamp(casa ? casa.indice : 0, 0, vizinhos.length));
      }
    }
    inserir(caixa, el, outros, Math.min(i, outros.length));
  }

  const arrasto = criarArrasto({
    raiz: sb,
    pegar: (ev) => (editar() && ev.target.closest ? ev.target.closest('.sb-app[data-open]') : null),
    nos: () => [...sb.querySelectorAll('.sb-app')],
    zonas: () => {
      const lista = [];
      const g = grelha();
      if (g) lista.push({ caixa: g, itens: naCaixa(g) });
      lista.push({ caixa: dock, itens: naCaixa(dock) });
      return lista;
    },
    // A Dock apanha o que lhe chega por cima; o resto do ecrã é grelha.
    // Não há «fora»: no telefone o ícone está sempre sobre o SpringBoard.
    zona: (zonas, c) => {
      const d = zonas.find((z) => z.caixa === dock);
      if (d && c.y > d.rect.top - 8) return d;
      return zonas.find((z) => z.caixa !== dock) || d || null;
    },
    mover,
    pegou: (el) => {
      deslocado = null;
      partiuDaDock = dock.contains(el);
    },
    largou: (el) => {
      deslocado = null;
      guardar(el, true);
      // Mudou de caixa: a página ficou com um buraco, ou com um ícone a
      // mais do que as linhas que lá cabem. O SpringBoard nunca deixa
      // uma linha meia — é o `reflow()` que redistribui, e vai com
      // refluxo para não aparecer um salto depois de o dedo já ter
      // largado. Reordenar dentro da mesma caixa não mexe em nada disto.
      if (dock.contains(el) === partiuDaDock) return;
      setTimeout(() => arrasto.refluir(() => ph.pages.reflow()), 320);
    },
  });

  // ── Teclado ────────────────────────────────────────────────────────
  // Option com as setas muda de lugar; Option‑Shift para cima e para
  // baixo entra e sai da Dock. Sem isto, reordenar era um gesto só para
  // quem vê e aponta, e um gesto assim não está feito.
  function passoNaCaixa(el, caixa, delta) {
    if (!caixa) return false;
    const lista = naCaixa(caixa);
    const de = lista.indexOf(el);
    if (de < 0) return false;
    const para = clamp(de + delta, 0, lista.length - 1);
    if (para === de) return false;
    arrasto.refluir(() => inserir(caixa, el, lista.filter((n) => n !== el), para));
    return true;
  }

  function trocarCaixa(el, paraDock) {
    const g = grelha();
    if (!g) return false;
    if (paraDock) {
      const outros = naCaixa(dock);
      if (outros.length >= MAX) {
        const fora = outros.pop();
        arrasto.refluir(() => {
          inserir(g, fora, naCaixa(g).filter((n) => n !== fora && n !== el), 0);
          inserir(dock, el, naCaixa(dock).filter((n) => n !== el && n !== fora), outros.length);
        });
        return true;
      }
      arrasto.refluir(() => inserir(dock, el, outros, outros.length));
      return true;
    }
    arrasto.refluir(() => inserir(g, el, naCaixa(g).filter((n) => n !== el), 0));
    return true;
  }

  sb.addEventListener('keydown', (ev) => {
    if (!ev.altKey || ev.metaKey || ev.ctrlKey || !editar()) return;
    const el = ev.target.closest && ev.target.closest('.sb-app[data-open]');
    if (!el) return;
    const vertical = ev.key === 'ArrowUp' ? -1 : ev.key === 'ArrowDown' ? 1 : 0;
    const horizontal = ev.key === 'ArrowLeft' ? -1 : ev.key === 'ArrowRight' ? 1 : 0;
    if (!vertical && !horizontal) return;
    ev.preventDefault();
    const naDock = dock.contains(el);
    let mudou = false;
    if (ev.shiftKey && vertical) {
      // Para baixo entra na Dock, para cima sai dela — e só isso: um
      // atalho que faz a mesma coisa nos dois sentidos não se aprende.
      if (!naDock && vertical > 0) mudou = trocarCaixa(el, true);
      else if (naDock && vertical < 0) mudou = trocarCaixa(el, false);
    } else if (horizontal) mudou = passoNaCaixa(el, naDock ? dock : grelha(), horizontal);
    else if (!naDock) mudou = passoNaCaixa(el, grelha(), vertical * COLS);
    if (!mudou) return;
    // Mover um nó no DOM pode fazer-lhe perder o foco, e quem está a
    // arrumar o ecrã com as setas ficava sem o ícone debaixo do teclado.
    el.focus({ preventScroll: true });
    guardar(el, true);
  });

  // Da primeira vez que um ícone recebe foco em edição, diz-se como é
  // que ele se move. Depois cala-se: repetir a cada foco era ruído.
  let dita = false;
  sb.addEventListener(
    'focusin',
    (ev) => {
      if (dita || !editar() || !ev.target.closest('.sb-app[data-open]')) return;
      dita = true;
      anunciar(s.hint + ' ' + s.hintDock);
    },
    true
  );
}
