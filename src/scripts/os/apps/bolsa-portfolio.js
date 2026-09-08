// ─────────────────────────────────────────────────────────────────────
// O portefólio: as posições reais do Hélder — VWCE, SXR8, MSFT — com as
// acções e o preço médio de cada uma. Os números ficam só neste
// dispositivo, como a lista; por omissão estão por preencher, porque
// não há posição nenhuma a inventar.
//
// Em edição, cada linha ganha dois campos — acções e preço médio — em
// vez do botão de remover: o portefólio não se esvazia, ajusta-se.
// ─────────────────────────────────────────────────────────────────────
import { prefs, setPref } from '../state.js';
import { esc } from '../lib/dom.js';
import { sparkline } from './bolsa-grafico.js';

export function createPortfolio(ctx, money, signed, tone) {
  const t = ctx.data.strings.bolsa;

  const holdings = () => prefs.portfolioHoldings || {};
  const holdingOf = (symbol) => holdings()[symbol] || { shares: null, cost: null };

  function setHolding(symbol, patch) {
    const next = Object.assign({}, holdings());
    next[symbol] = Object.assign({}, holdingOf(symbol), patch);
    setPref('portfolioHoldings', next);
  }

  /** Valor e ganho de uma posição, ou null se não houver acções. */
  function figures(symbol, price) {
    const h = holdingOf(symbol);
    if (!h.shares || typeof price !== 'number') return null;
    const value = h.shares * price;
    const gain = typeof h.cost === 'number' ? value - h.shares * h.cost : null;
    const percent = typeof h.cost === 'number' && h.cost ? (gain / (h.shares * h.cost)) * 100 : null;
    return { value, gain, percent };
  }

  function totals(entries, quotes) {
    let value = 0;
    let cost = 0;
    let any = false;
    for (const { symbol } of entries) {
      const h = holdingOf(symbol);
      const q = quotes.get(symbol);
      if (!h.shares || !q) continue;
      any = true;
      value += h.shares * q.price;
      if (typeof h.cost === 'number') cost += h.shares * h.cost;
    }
    if (!any) return null;
    const gain = cost ? value - cost : null;
    const percent = cost ? (gain / cost) * 100 : null;
    return { value, gain, percent };
  }

  /** `entries` é [{symbol, label}], na ordem do portefólio. */
  function renderList(list, entries, quotes, current, editing) {
    if (!entries.length) {
      list.innerHTML = '<li class="stk-empty-row py-5 px-2.5 text-center text-[length:var(--t-foot)] text-(--ink-3)">' + esc(t.empty) + '</li>';
      return;
    }
    list.innerHTML = entries
      .map(({ symbol, label }) => {
        const q = quotes.get(symbol);
        const k = q ? tone(q) : 'flat';
        const h = holdingOf(symbol);
        const fig = q ? figures(symbol, q.price) : null;
        const shown = label || symbol;
        const editRow = editing
          ? '<span class="stk-hold-edit flex gap-1.5">' +
            '<label class="sr" for="stk-shares-' + esc(symbol) + '">' + esc(t.sharesPlaceholder) + '</label>' +
            '<input id="stk-shares-' + esc(symbol) + '" type="number" min="0" step="any" inputmode="decimal" placeholder="' + esc(t.sharesPlaceholder) + '" value="' + (h.shares ?? '') + '" data-stk-shares="' + esc(symbol) + '" class="w-19 border-[0.5px] border-(--line) bg-(--surface-solid) px-1.75 py-1.25 text-right text-[length:var(--t-foot)] text-(--ink) tabular-nums outline-hidden focus:border-(--accent)" />' +
            '<label class="sr" for="stk-cost-' + esc(symbol) + '">' + esc(t.costPlaceholder) + '</label>' +
            '<input id="stk-cost-' + esc(symbol) + '" type="number" min="0" step="any" inputmode="decimal" placeholder="' + esc(t.costPlaceholder) + '" value="' + (h.cost ?? '') + '" data-stk-cost="' + esc(symbol) + '" class="w-19 border-[0.5px] border-(--line) bg-(--surface-solid) px-1.75 py-1.25 text-right text-[length:var(--t-foot)] text-(--ink) tabular-nums outline-hidden focus:border-(--accent)" />' +
            '</span>'
          : '';
        return (
          '<li class="stk-row stk-hold relative grid cursor-default grid-cols-[0_1fr_auto_auto] items-center gap-2.5 px-2.5 py-2.25 transition-[grid-template-columns] duration-200 ease-(--ease-os) [[data-mode=\'ios\']_&]:py-3' + (symbol === current ? ' on bg-(--accent) text-white' : '') + (editing ? ' editing-row' : '') + '" data-symbol="' + esc(symbol) + '" data-label="' + esc(shown) + '">' +
          '<span class="stk-id grid min-w-0 gap-px"><span class="stk-sym text-[length:var(--t-headline)] font-bold tracking-[-0.01em]">' + esc(shown) + '</span>' +
          '<span class="stk-name overflow-hidden text-ellipsis whitespace-nowrap text-[length:var(--t-foot)] text-(--ink-3)">' + esc(q ? q.name : t.loading) + '</span></span>' +
          (editing
            ? editRow
            : '<span class="stk-spark [&_svg]:block">' + (q ? sparkline(q.points, k) : '') + '</span>' +
              '<span class="stk-quote grid justify-items-end gap-0.5">' +
              (fig
                ? '<span class="stk-price text-[length:var(--t-headline)] font-semibold tabular-nums">' + money(fig.value) + '</span><span class="stk-pill ' + (fig.gain == null ? 'flat' : fig.gain >= 0 ? 'up' : 'down') + ' min-w-[68px] px-1.75 py-0.75 text-right text-[length:var(--t-foot)] font-semibold text-white tabular-nums">' + (fig.gain == null ? '—' : signed(fig.percent, '%')) + '</span>'
                : '<span class="stk-price text-[length:var(--t-headline)] font-semibold tabular-nums">' + (q ? money(q.price) : '—') + '</span><span class="stk-pill flat min-w-[68px] px-1.75 py-0.75 text-right text-[length:var(--t-foot)] font-semibold text-white tabular-nums">' + esc(t.noHoldings ? '·' : '') + '</span>') +
              '</span>') +
          '</li>'
        );
      })
      .join('');
  }

  function renderTotals(el, entries, quotes) {
    const sum = totals(entries, quotes);
    if (!sum) {
      el.hidden = true;
      return;
    }
    el.hidden = false;
    const tone_ = sum.gain == null ? 'flat' : sum.gain >= 0 ? 'up' : 'down';
    el.innerHTML =
      '<span class="stk-total-label flex-[0_0_100%] text-[length:var(--t-caption)] text-(--ink-3)">' + esc(t.totalValue) + '</span>' +
      '<span class="stk-total-value text-[length:var(--t-headline)] font-bold tabular-nums">' + money(sum.value) + '</span>' +
      (sum.gain != null ? '<span class="stk-total-gain ' + tone_ + ' text-[length:var(--t-foot)] font-semibold tabular-nums">' + esc(t.totalGain) + ' ' + signed(sum.gain) + ' (' + signed(sum.percent, '%') + ')</span>' : '');
  }

  /** `onChange` corre depois de guardar — é quem chama que actualiza o total. */
  function wireInputs(list, onChange) {
    list.addEventListener('change', (ev) => {
      const shares = ev.target.closest('[data-stk-shares]');
      const cost = ev.target.closest('[data-stk-cost]');
      const input = shares || cost;
      if (!input) return;
      const symbol = input.dataset.stkShares || input.dataset.stkCost;
      const value = input.value === '' ? null : Number(input.value);
      setHolding(symbol, shares ? { shares: value } : { cost: value });
      if (onChange) onChange();
    });
  }

  return { renderList, renderTotals, wireInputs, holdingOf };
}
