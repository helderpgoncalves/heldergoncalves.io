// ─────────────────────────────────────────────────────────────────────
// A Bolsa.
//
// Uma lista de títulos à esquerda, cada um com a linha do dia e a
// variação numa cápsula verde ou vermelha, e à direita o título
// escolhido com o gráfico e o intervalo. As cotações vêm do nosso
// servidor, que é quem fala com a fonte; enquanto a aplicação estiver
// aberta e o separador visível, pedem-se de novo a cada meio minuto.
//
// A lista é do visitante: acrescenta-se pelo campo de cima, tira-se em
// modo de edição, e fica nas preferências do dispositivo.
// ─────────────────────────────────────────────────────────────────────
import { prefs, setPref } from '../state.js';
import { esc } from '../lib/dom.js';
import { sparkline, chart } from './bolsa-grafico.js';

const EVERY_MS = 30000;

export function initBolsa(ctx) {
  const el = ctx.contentNode('bolsa');
  if (!el) return;
  const t = ctx.data.strings.bolsa;
  const list = el.querySelector('[data-stk-list]');
  const main = el.querySelector('[data-stk-main]');
  const note = el.querySelector('[data-stk-note]');
  const form = el.querySelector('[data-stk-add]');
  const field = form.querySelector('input');

  let symbols = Array.isArray(prefs.stocks) && prefs.stocks.length ? prefs.stocks.slice() : el.dataset.default.split(',');
  let quotes = new Map();
  let current = null;
  let range = '1d';
  let timer = 0;
  let open = false;

  const money = (q, v) => {
    if (typeof v !== 'number') return '—';
    const digits = Math.abs(v) >= 1000 ? 2 : Math.abs(v) >= 1 ? 2 : 4;
    return v.toLocaleString(ctx.data.intlLocale, { minimumFractionDigits: digits, maximumFractionDigits: digits });
  };
  const signed = (v, suffix) => (typeof v !== 'number' ? '—' : (v > 0 ? '+' : '') + money(null, v) + (suffix || ''));
  const tone = (q) => (typeof q.change !== 'number' || q.change === 0 ? 'flat' : q.change > 0 ? 'up' : 'down');

  async function load(syms, r) {
    if (!syms.length) return [];
    const res = await fetch('/api/bolsa?s=' + encodeURIComponent(syms.join(',')) + '&r=' + r, {
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) throw new Error('http');
    const data = await res.json();
    return data.ok ? data.quotes : [];
  }

  function renderList() {
    if (!symbols.length) {
      list.innerHTML = '<li class="stk-empty-row">' + esc(t.empty) + '</li>';
      return;
    }
    list.innerHTML = symbols
      .map((s) => {
        const q = quotes.get(s);
        const k = q ? tone(q) : 'flat';
        return (
          '<li class="stk-row' + (s === current ? ' on' : '') + '" data-symbol="' + esc(s) + '">' +
          '<button class="stk-remove" type="button" aria-label="' + esc(t.remove) + '">−</button>' +
          '<span class="stk-id"><span class="stk-sym">' + esc(s) + '</span>' +
          '<span class="stk-name">' + esc(q ? q.name : t.loading) + '</span></span>' +
          '<span class="stk-spark">' + (q ? sparkline(q.points, k) : '') + '</span>' +
          '<span class="stk-quote"><span class="stk-price">' + (q ? money(q, q.price) : '—') + '</span>' +
          '<span class="stk-pill ' + k + '">' + (q ? signed(q.percent, '%') : '…') + '</span></span>' +
          '</li>'
        );
      })
      .join('');
  }

  function renderMain(q, detail) {
    if (!q) {
      main.innerHTML =
        '<div class="stk-empty"><svg viewBox="0 0 100 100" width="44" height="44" aria-hidden="true"><use href="#icon-bolsa"/></svg><p>' +
        esc(t.pick) +
        '</p></div>';
      return;
    }
    const k = tone(q);
    const when = new Date().toLocaleTimeString(ctx.data.intlLocale, { hour: '2-digit', minute: '2-digit' });
    main.innerHTML =
      '<div class="stk-detail">' +
      '<header class="stk-title"><div><h2>' + esc(q.symbol) + '</h2><p>' + esc(q.name) + '</p></div>' +
      '<div class="stk-big"><span class="stk-bigprice">' + money(q, q.price) + '</span>' +
      '<span class="stk-change ' + k + '">' + signed(q.change) + ' (' + signed(q.percent, '%') + ')</span></div></header>' +
      '<div class="seg stk-ranges" role="tablist">' +
      Object.keys(t.ranges)
        .map((r) => '<button type="button" role="tab" data-range="' + r + '" aria-pressed="' + (r === range) + '">' + esc(t.ranges[r]) + '</button>')
        .join('') +
      '</div>' +
      '<div class="stk-chart">' + chart(detail ? detail.points : q.points, k, detail ? detail.previous : q.previous) + '</div>' +
      '<dl class="stk-stats">' +
      '<div><dt>' + esc(t.previous) + '</dt><dd>' + money(q, q.previous) + '</dd></div>' +
      '<div><dt>' + esc(t.currency) + '</dt><dd>' + esc(q.currency || '—') + '</dd></div>' +
      '<div><dt>' + esc(t.market) + '</dt><dd>' + esc(q.market === 'REGULAR' ? t.marketOpen : t.marketClosed) + '</dd></div>' +
      '<div><dt>' + esc(t.updated) + '</dt><dd>' + esc(when) + '</dd></div>' +
      '</dl>' +
      '<p class="stk-source">' + esc(t.source) + ' ' + esc(t.live) + '</p>' +
      '</div>';
  }

  async function refresh() {
    try {
      const rows = await load(symbols, '1d');
      rows.forEach((q) => quotes.set(q.symbol, q));
      renderList();
      if (current && quotes.get(current)) await showDetail(current);
      note.textContent = t.lead;
    } catch (_) {
      note.textContent = t.unavailable;
    }
  }

  async function showDetail(symbol) {
    current = symbol;
    list.querySelectorAll('.stk-row').forEach((li) => li.classList.toggle('on', li.dataset.symbol === symbol));
    const q = quotes.get(symbol);
    if (!q) return;
    if (range === '1d') return renderMain(q, null);
    try {
      const [d] = await load([symbol], range);
      renderMain(q, d || null);
    } catch (_) {
      renderMain(q, null);
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

  // ── A lista ────────────────────────────────────────────────────────
  el.addEventListener('click', async (ev) => {
    const rm = ev.target.closest('.stk-remove');
    if (rm) {
      const s = rm.closest('.stk-row').dataset.symbol;
      symbols = symbols.filter((x) => x !== s);
      setPref('stocks', symbols);
      if (current === s) {
        current = null;
        renderMain(null);
      }
      renderList();
      return;
    }
    const row = ev.target.closest('.stk-row');
    if (row) {
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
      return;
    }
    if (ev.target.closest('[data-stk-back]')) el.classList.remove('detail');
  });

  form.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    const s = field.value.trim().toUpperCase();
    if (!s || symbols.includes(s)) return;
    note.textContent = t.loading;
    try {
      const [q] = await load([s], '1d');
      if (!q) throw new Error('nada');
      quotes.set(q.symbol, q);
      symbols = symbols.concat(q.symbol);
      setPref('stocks', symbols);
      field.value = '';
      renderList();
      note.textContent = t.lead;
    } catch (_) {
      note.textContent = t.notFound;
    }
  });

  renderList();
}
