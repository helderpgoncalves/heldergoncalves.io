// ─────────────────────────────────────────────────────────────────────
// O Calendário: o mês, e quem manda nas outras vistas.
//
// A vista de mês é a do iOS 26: o nome do mês grande à esquerda com o
// ano na navegação por cima, as iniciais dos dias, e uma pilha de
// semanas separadas por uma linha a toda a largura — sem grelha
// vertical, que a app da Apple não tem. Por baixo de cada número, os
// pontos do que lá acontece.
//
// O dia (calendario-dia.js) e as folhas (calendario-folhas.js) são
// ficheiros ao lado; este é o que os monta e o único que ouve cliques —
// um listener no conteúdo, ligado uma vez, como manda o padrão das apps.
// ─────────────────────────────────────────────────────────────────────
import { esc } from '../lib/dom.js';
import { diaDoKey, eventosPorDia, keyOf, pontosDoDia, somaDias } from './calendario-dados.js';
import { criarDia } from './calendario-dia.js';
import { criarFolhas } from './calendario-folhas.js';

export function createView(el, t, ctx, state) {
  const locale = ctx.data.intlLocale;
  const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
  const fmt = {
    cap,
    mes: new Intl.DateTimeFormat(locale, { month: 'long' }),
    hora: new Intl.DateTimeFormat(locale, { hour: '2-digit', minute: '2-digit' }),
    dia: new Intl.DateTimeFormat(locale, { weekday: 'long', day: 'numeric', month: 'long' }),
    longo: new Intl.DateTimeFormat(locale, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }),
    inicial: new Intl.DateTimeFormat(locale, { weekday: 'narrow' }),
  };

  const gate = el.querySelector('[data-cal-gate]');
  const off = el.querySelector('[data-cal-off]');
  const entrar = el.querySelector('[data-cal-signin]');
  const panes = el.querySelector('[data-cal-panes]');
  const float = el.querySelector('[data-cal-float]');
  const novo = el.querySelector('[data-cal-newblock]');
  const title = el.querySelector('[data-cal-title]');
  const year = el.querySelector('[data-cal-year]');
  const week = el.querySelector('[data-cal-week]');
  const grid = el.querySelector('[data-cal-grid]');

  let handlers = {};
  const dia = criarDia(el, t, fmt, state, () => handlers);
  const folhas = criarFolhas(el, t, fmt, state, () => handlers);

  const WD = 'py-1 text-center text-[length:var(--t-caption2)] font-semibold uppercase tracking-[0.04em] text-(--ink-3)';

  function renderWeekHeader() {
    const base = somaDias(new Date(2024, 0, 1), 0); // 1 de Janeiro de 2024 foi uma segunda
    week.innerHTML = [0, 1, 2, 3, 4, 5, 6]
      .map((i) => '<span class="' + WD + '">' + esc(fmt.inicial.format(somaDias(base, i))) + '</span>')
      .join('');
  }

  /** O rótulo de uma célula. Um ponto de cor nunca é a única forma de
   *  saber que há alguma coisa nesse dia: quem ouve o ecrã ouve isto. */
  function rotulo(d, lista, hoje) {
    const partes = [fmt.cap(fmt.dia.format(d))];
    if (hoje) partes.push(t.today);
    const marcadas = lista.filter((e) => e.kind === 'mine' || e.kind === 'meeting' || e.kind === 'busy').length;
    const livres = lista.filter((e) => e.kind === 'free').length;
    const bloqueios = lista.filter((e) => e.kind === 'bloqueio').length;
    if (marcadas) partes.push(marcadas + ' ' + (marcadas === 1 ? t.meetingOne : t.meetings));
    if (livres) partes.push(livres + ' ' + (livres === 1 ? t.free : t.frees));
    if (bloqueios) partes.push(t.block.toLowerCase());
    return partes.join(', ');
  }

  function celula(d, lista, inMonth) {
    const k = keyOf(d);
    const hoje = k === keyOf(new Date());
    const classes = 'cal-cell' + (inMonth ? '' : ' out') + (hoje ? ' today' : '') + (k === state.selected ? ' on' : '');
    return (
      '<button type="button" role="gridcell" class="' + classes + '" data-day="' + k + '"' +
      ' tabindex="' + (k === state.selected ? '0' : '-1') + '"' +
      (hoje ? ' aria-current="date"' : '') +
      ' aria-label="' + esc(rotulo(d, lista, hoje)) + '">' +
      '<span class="cal-num">' + d.getDate() + '</span>' +
      '<span class="cal-dots" aria-hidden="true">' +
      pontosDoDia(lista).map((e) => '<i class="cal-dot ' + e.kind + '"></i>').join('') +
      '</span></button>'
    );
  }

  function renderGrid() {
    const porDia = eventosPorDia(state);
    const first = state.month;
    const offset = (first.getDay() + 6) % 7; // a semana começa à segunda
    const dias = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate();
    const total = Math.ceil((offset + dias) / 7) * 7;
    const linhas = [];
    for (let i = 0; i < total; i += 7) {
      const celulas = [];
      for (let j = 0; j < 7; j++) {
        const n = i + j - offset + 1;
        const d = new Date(first.getFullYear(), first.getMonth(), n);
        celulas.push(celula(d, porDia.get(keyOf(d)) || [], n >= 1 && n <= dias));
      }
      linhas.push('<div class="cal-row" role="row">' + celulas.join('') + '</div>');
    }
    grid.innerHTML = linhas.join('');
    title.textContent = fmt.cap(fmt.mes.format(first));
    year.textContent = String(first.getFullYear());
  }

  function render() {
    const dentro = Boolean(state.email);
    // Se as marcações estiverem desligadas no servidor, entrar não leva
    // a lado nenhum: diz-se isso, em vez de oferecer um botão que falha.
    off.hidden = state.enabled;
    entrar.hidden = !state.enabled;
    gate.hidden = dentro;
    panes.hidden = !dentro;
    float.hidden = !dentro;
    novo.hidden = !state.owner;
    el.dataset.view = state.view;
    el.querySelectorAll('[data-cal-view]').forEach((b) => {
      const on = b.dataset.calView === state.view;
      b.setAttribute('aria-pressed', String(on));
      b.classList.toggle('bg-(--surface-3)', on);
      b.classList.toggle('text-(--ink)', on);
      b.classList.toggle('text-(--ink-2)', !on);
    });
    if (!dentro) return;
    renderWeekHeader();
    renderGrid();
    dia.render();
  }

  /** Devolve o foco à célula do dia escolhido — a grelha foi reescrita
   *  e o nó que tinha o foco já não existe. */
  function focarDia() {
    const alvo = grid.querySelector('[data-day="' + state.selected + '"]');
    if (alvo) alvo.focus();
  }

  // ── Teclado ────────────────────────────────────────────────────────
  // As setas andam pela grelha como no calendário do sistema: um dia de
  // cada vez, uma semana de cada vez, e o mês muda sozinho ao sair dele.
  const SALTO = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 };
  grid.addEventListener('keydown', (ev) => {
    const salto = SALTO[ev.key];
    if (salto === undefined) return;
    ev.preventDefault();
    // O foco só se devolve depois de a grelha estar reescrita — sair do
    // mês obriga a ir ao servidor buscar o mês novo primeiro.
    Promise.resolve(handlers.selectDay(keyOf(somaDias(diaDoKey(state.selected), salto)))).then(focarDia);
  });

  // ── Um clique, um sítio ────────────────────────────────────────────
  el.addEventListener('click', (ev) => {
    const cell = ev.target.closest('[data-day]');
    if (cell) return handlers.pick(cell.dataset.day);
    const bloco = ev.target.closest('[data-cal-event]');
    if (bloco) return folhas.abrirEvento(bloco.dataset.calEvent, bloco.dataset.calKind);
    const strip = ev.target.closest('[data-strip-day]');
    if (strip) return handlers.selectDay(strip.dataset.stripDay);
    const v = ev.target.closest('[data-cal-view]');
    if (v) return handlers.setView(v.dataset.calView);
    if (ev.target.closest('[data-cal-prev]')) return handlers.prev();
    if (ev.target.closest('[data-cal-next]')) return handlers.next();
    if (ev.target.closest('[data-cal-today]')) return handlers.today();
    if (ev.target.closest('[data-cal-back]')) return handlers.setView('month');
    if (ev.target.closest('[data-cal-signin]')) return handlers.signIn();
    if (ev.target.closest('[data-cal-newblock]')) return folhas.abrirBloco();
    folhas.cliqueNaFolha(ev);
  });

  return {
    render,
    closeSheet: folhas.fechar,
    sheetHint: folhas.aviso,
    blockHint: folhas.avisoBloco,
    wire: (h) => {
      handlers = h;
      dia.wire();
    },
  };
}
