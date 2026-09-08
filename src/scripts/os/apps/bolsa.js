// ─────────────────────────────────────────────────────────────────────
// A Bolsa.
//
// Duas listas à esquerda — a lista e o portefólio — cada título com a
// linha do dia e a variação numa cápsula verde ou vermelha, e à
// direita o título escolhido: preço, gráfico com cursor, intervalo,
// estatísticas, «Acerca» e notícias. As cotações vêm do nosso
// servidor, que é quem fala com a fonte; enquanto a aplicação estiver
// aberta e o separador visível, pedem-se de novo a cada meio minuto.
//
// A lista é do visitante: acrescenta-se pela procura, tira-se em modo
// de edição, e fica nas preferências do dispositivo. O portefólio é
// fixo — é o do Hélder — mas as acções e o preço médio de cada posição
// também ficam só aqui, e só quem os escreve os vê.
// ─────────────────────────────────────────────────────────────────────
import { prefs, setPref } from '../state.js';
import { esc } from '../lib/dom.js';
import { createDetalhe } from './bolsa-detalhe.js';
import { createPortfolio } from './bolsa-portfolio.js';
import { sparkline } from './bolsa-grafico.js';

const EVERY_MS = 30000;
const SEARCH_DEBOUNCE = 260;

export function initBolsa(ctx) {
  const el = ctx.contentNode('bolsa');
  if (!el) return;
  const t = ctx.data.strings.bolsa;
  const watchList = el.querySelector('[data-stk-list="watch"]');
  const portfolioList = el.querySelector('[data-stk-list="portfolio"]');
  const totals = el.querySelector('[data-stk-totals]');
  const main = el.querySelector('[data-stk-main]');
  const note = el.querySelector('[data-stk-note]');
  const searchField = el.querySelector('[data-stk-search]');
  const suggest = el.querySelector('[data-stk-suggest]');

  const portfolioEntries = el.dataset.portfolio.split(',').map((symbol) => {
    const li = portfolioList.querySelector('[data-symbol="' + CSS.escape(symbol) + '"]');
    return { symbol, label: (li && li.dataset.label) || symbol };
  });
  const labelOf = (symbol) => (portfolioEntries.find((p) => p.symbol === symbol) || {}).label;

  let watch = Array.isArray(prefs.stocks) && prefs.stocks.length ? prefs.stocks.slice() : el.dataset.default.split(',');
  let quotes = new Map();
  let current = null;
  let range = '1d';
  let timer = 0;
  let open = false;

  const money = (v) => {
    if (typeof v !== 'number') return '—';
    const digits = Math.abs(v) >= 1 ? 2 : 4;
    return v.toLocaleString(ctx.data.intlLocale, { minimumFractionDigits: digits, maximumFractionDigits: digits });
  };
  const signed = (v, suffix) => (typeof v !== 'number' ? '—' : (v > 0 ? '+' : '') + money(v) + (suffix || ''));
  const tone = (q) => (typeof q.change !== 'number' || q.change === 0 ? 'flat' : q.change > 0 ? 'up' : 'down');

  const detalhe = createDetalhe(ctx, money, signed, tone);
  const portfolio = createPortfolio(ctx, money, signed, tone);
  portfolio.wireInputs(portfolioList, () => portfolio.renderTotals(totals, portfolioEntries, quotes));

  async function load(syms, r) {
    if (!syms.length) return [];
    const res = await fetch('/api/bolsa?s=' + encodeURIComponent(syms.join(',')) + '&r=' + r, {
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) throw new Error('http');
    const data = await res.json();
    return data.ok ? data.quotes : [];
  }

  function renderWatch() {
    if (!watch.length) {
      watchList.innerHTML = '<li class="stk-empty-row py-5 px-2.5 text-center text-[length:var(--t-foot)] text-(--ink-3)">' + esc(t.empty) + '</li>';
      return;
    }
    const editing = el.classList.contains('editing');
    watchList.innerHTML = watch
      .map((s) => {
        const q = quotes.get(s);
        const k = q ? tone(q) : 'flat';
        return (
          '<li class="stk-row relative grid cursor-default grid-cols-[0_1fr_auto_auto] items-center gap-2.5 px-2.5 py-2.25 transition-[grid-template-columns] duration-200 ease-(--ease-os) [[data-mode=\'ios\']_&]:py-3' + (s === current ? ' on bg-(--accent) text-white' : '') + '" data-symbol="' + esc(s) + '">' +
          (editing ? '<button class="stk-remove relative grid h-[22px] w-[22px] place-items-center rounded-full bg-(--red) text-lg leading-none text-white" type="button" aria-label="' + esc(t.remove) + '">−</button>' : '') +
          '<span class="stk-id grid min-w-0 gap-px"><span class="stk-sym text-[length:var(--t-headline)] font-bold tracking-[-0.01em]">' + esc(s) + '</span>' +
          '<span class="stk-name overflow-hidden text-ellipsis whitespace-nowrap text-[length:var(--t-foot)] text-(--ink-3)">' + esc(q ? q.name : t.loading) + '</span></span>' +
          '<span class="stk-spark [&_svg]:block">' + (q ? sparkline(q.points, k) : '') + '</span>' +
          '<span class="stk-quote grid justify-items-end gap-0.5"><span class="stk-price text-[length:var(--t-headline)] font-semibold tabular-nums">' + (q ? money(q.price) : '—') + '</span>' +
          '<span class="stk-pill ' + k + ' min-w-[68px] px-1.75 py-0.75 text-right text-[length:var(--t-foot)] font-semibold text-white tabular-nums">' + (q ? signed(q.percent, '%') : '…') + '</span></span>' +
          '</li>'
        );
      })
      .join('');
  }

  function renderPortfolio() {
    // A meio de escrever um valor, o relógio de 30 s não pode apagar o
    // campo por baixo do dedo: só o total, que não tem cursor a perder.
    if (document.activeElement && portfolioList.contains(document.activeElement)) {
      portfolio.renderTotals(totals, portfolioEntries, quotes);
      return;
    }
    const editing = el.classList.contains('editing');
    portfolio.renderList(portfolioList, portfolioEntries, quotes, current, editing);
    portfolio.renderTotals(totals, portfolioEntries, quotes);
  }

  async function refresh() {
    try {
      const all = Array.from(new Set(watch.concat(portfolioEntries.map((p) => p.symbol))));
      const rows = await load(all, '1d');
      rows.forEach((q) => quotes.set(q.symbol, q));
      renderWatch();
      renderPortfolio();
      if (current && quotes.get(current) && range === '1d') detalhe.render(main, quotes.get(current), labelOf(current), range, null);
      note.textContent = t.lead;
    } catch (_) {
      note.textContent = t.unavailable;
    }
  }

  async function showDetail(symbol) {
    current = symbol;
    el.querySelectorAll('.stk-row').forEach((li) => li.classList.toggle('on', li.dataset.symbol === symbol));
    const q = quotes.get(symbol);
    if (!q) return;
    if (range === '1d') return detalhe.render(main, q, labelOf(symbol), range, null);
    try {
      const [d] = await load([symbol], range);
      detalhe.render(main, q, labelOf(symbol), range, d || null);
    } catch (_) {
      detalhe.render(main, q, labelOf(symbol), range, null);
    }
  }

  // ── O relógio: só com a aplicação aberta e o separador à vista ────
  function schedule() {
    clearTimeout(timer);
    if (!open || document.hidden) return;
    timer = setTimeout(async () => {
      await refresh();
      schedule();
    }, EVERY_MS);
  }
  document.addEventListener('visibilitychange', schedule);

  ctx.prepareStocks = () => {
    open = true;
    refresh().then(schedule);
  };
  ctx.pauseStocks = () => {
    open = false;
    clearTimeout(timer);
  };

  // ── A procura ──────────────────────────────────────────────────────
  let searchTimer = 0;
  let searchSeq = 0;
  function closeSuggest() {
    suggest.hidden = true;
    suggest.innerHTML = '';
  }
  async function runSearch(q) {
    const seq = ++searchSeq;
    if (!q) return closeSuggest();
    suggest.hidden = false;
    suggest.innerHTML = '<p class="stk-suggest-note m-0 px-3 py-2.5 text-[length:var(--t-foot)] text-(--ink-3)">' + esc(t.searching) + '</p>';
    try {
      const res = await fetch('/api/bolsa/procurar?q=' + encodeURIComponent(q), { headers: { Accept: 'application/json' } });
      const data = res.ok ? await res.json() : null;
      if (seq !== searchSeq) return;
      const results = (data && data.ok && data.results) || [];
      if (!results.length) {
        suggest.innerHTML = '<p class="stk-suggest-note m-0 px-3 py-2.5 text-[length:var(--t-foot)] text-(--ink-3)">' + esc(t.searchEmpty) + '</p>';
        return;
      }
      suggest.innerHTML = results
        .map(
          (r) =>
            '<button type="button" class="stk-suggest-item flex w-full flex-col items-start gap-px px-2.5 py-2 text-left hover:bg-(--surface-3)" data-add="' + esc(r.symbol) + '">' +
            '<span class="stk-sym text-[length:var(--t-headline)] font-bold tracking-[-0.01em]">' + esc(r.symbol) + '</span>' +
            '<span class="stk-name text-[length:var(--t-foot)] text-(--ink-3)">' + esc(r.name) + (r.exchange ? ' · ' + esc(r.exchange) : '') + '</span>' +
            '</button>'
        )
        .join('');
    } catch (_) {
      if (seq === searchSeq) closeSuggest();
    }
  }
  searchField.addEventListener('input', () => {
    clearTimeout(searchTimer);
    const q = searchField.value.trim();
    searchTimer = setTimeout(() => runSearch(q), SEARCH_DEBOUNCE);
  });
  searchField.addEventListener('focus', () => {
    if (searchField.value.trim()) runSearch(searchField.value.trim());
  });
  document.addEventListener('click', (ev) => {
    if (!ev.target.closest('.stk-add')) closeSuggest();
  });

  function addSymbol(symbol) {
    if (watch.includes(symbol)) return showDetail(symbol);
    watch = watch.concat(symbol);
    setPref('stocks', watch);
    renderWatch();
    load([symbol], '1d').then((rows) => {
      if (rows[0]) quotes.set(rows[0].symbol, rows[0]);
      renderWatch();
    });
  }

  // ── Cliques ──────────────────────────────────────────────────────
  el.addEventListener('click', async (ev) => {
    const add = ev.target.closest('[data-add]');
    if (add) {
      addSymbol(add.dataset.add);
      searchField.value = '';
      closeSuggest();
      el.classList.add('detail');
      return;
    }
    const rm = ev.target.closest('.stk-remove');
    if (rm) {
      const s = rm.closest('.stk-row').dataset.symbol;
      watch = watch.filter((x) => x !== s);
      setPref('stocks', watch);
      if (current === s) {
        current = null;
        detalhe.empty(main);
      }
      renderWatch();
      return;
    }
    if (ev.target.closest('.stk-hold-edit')) return;
    const row = ev.target.closest('.stk-row');
    if (row && row.dataset.symbol) {
      el.classList.add('detail');
      return showDetail(row.dataset.symbol);
    }
    const tab = ev.target.closest('[data-range]');
    if (tab) {
      range = tab.dataset.range;
      return showDetail(current);
    }
    if (ev.target.closest('[data-stk-edit]')) {
      el.classList.toggle('editing');
      ev.target.closest('[data-stk-edit]').textContent = el.classList.contains('editing') ? t.done : t.edit;
      renderWatch();
      renderPortfolio();
      return;
    }
    if (ev.target.closest('[data-stk-back]')) el.classList.remove('detail');
  });

  renderWatch();
  renderPortfolio();
}
