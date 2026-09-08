// ─────────────────────────────────────────────────────────────────────
// O painel do título escolhido: preço, gráfico com cursor, intervalo,
// estatísticas, «Acerca» e notícias — a mesma ordem da aplicação Bolsa
// da Apple.
//
// A ficha (estatísticas, perfil, notícias) só existe com a API da
// Bolsa ligada; sem ela a resposta é 503 e estas secções não aparecem
// — o preço e o gráfico continuam a funcionar, porque esses vêm do
// Yahoo directo como recuo.
// ─────────────────────────────────────────────────────────────────────
import { esc } from '../lib/dom.js';
import { chart, wireChart } from './bolsa-grafico.js';

const RANGE_ORDER = ['1d', '1w', '1m', '3m', '6m', 'ytd', '1y', '2y', '5y'];

export function createDetalhe(ctx, money, signed, tone) {
  const t = ctx.data.strings.bolsa;
  const details = new Map();

  const compact = (v) =>
    typeof v === 'number' ? new Intl.NumberFormat(ctx.data.intlLocale, { notation: 'compact', maximumFractionDigits: 2 }).format(v) : '—';
  const pct = (v) => (typeof v === 'number' ? v.toFixed(2) + '%' : '—');

  async function fetchDetails(symbol) {
    if (details.has(symbol)) return details.get(symbol);
    const promise = fetch('/api/bolsa/detalhe?s=' + encodeURIComponent(symbol), { headers: { Accept: 'application/json' } })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => (d && d.ok ? d : null))
      .catch(() => null);
    details.set(symbol, promise);
    return promise;
  }

  function statsGrid(stats) {
    const rows = [
      ['open', money(stats.open)],
      ['high', money(stats.high)],
      ['low', money(stats.low)],
      ['high52', money(stats.high52)],
      ['low52', money(stats.low52)],
      ['marketCap', compact(stats.marketCap)],
      ['pe', typeof stats.pe === 'number' ? stats.pe.toFixed(2) : '—'],
      ['yield', typeof stats.yield === 'number' ? pct(stats.yield) : '—'],
      ['avgVolume', compact(stats.avgVolume)],
    ];
    return rows.map(([key, value]) => '<div class="stk-stats-item bg-(--surface-2) px-3 py-2.5"><dt class="text-[length:var(--t-caption)] text-(--ink-3)">' + esc(t.stats[key]) + '</dt><dd class="mt-0.5 mb-0 text-[length:var(--t-body)] font-semibold tabular-nums">' + esc(value) + '</dd></div>').join('');
  }

  function aboutSection(profile) {
    if (!profile || (!profile.summary && !profile.sector)) return '';
    const meta = [profile.sector, profile.industry].filter(Boolean).join(' · ');
    return (
      '<section class="stk-about">' +
      '<h3 class="m-0 mb-2 text-[length:var(--t-headline)] font-bold tracking-[-0.01em]">' + esc(t.about) + '</h3>' +
      (meta ? '<p class="stk-about-meta m-0 mb-1.5 text-[length:var(--t-foot)] text-(--ink-3)">' + esc(meta) + '</p>' : '') +
      (profile.summary ? '<p class="stk-about-text m-0 mb-2.5 text-[length:var(--t-subhead)] leading-[1.55] text-(--ink-2)">' + esc(profile.summary) + '</p>' : '') +
      (profile.website ? '<a class="stk-about-link text-[length:var(--t-subhead)] font-medium" href="' + esc(profile.website) + '" target="_blank" rel="noopener">' + esc(t.visitWebsite) + '</a>' : '') +
      '</section>'
    );
  }

  function newsSection(news) {
    if (!news || !news.length) return '';
    const when = (at) =>
      typeof at === 'number'
        ? new Intl.DateTimeFormat(ctx.data.intlLocale, { day: 'numeric', month: 'short' }).format(new Date(at * 1000))
        : '';
    return (
      '<section class="stk-news">' +
      '<h3 class="m-0 mb-2 text-[length:var(--t-headline)] font-bold tracking-[-0.01em]">' + esc(t.news) + '</h3>' +
      '<ul class="stk-news-list m-0 grid list-none gap-0.5 p-0">' +
      news
        .map(
          (n) =>
            '<li class="[&+&]:border-t-[0.5px] [&+&]:border-(--line)"><a class="flex items-center gap-3 py-2.5 text-inherit no-underline hover:no-underline [&:hover_strong]:underline" href="' + esc(n.url) + '" target="_blank" rel="noopener">' +
            (n.thumb ? '<img class="stk-news-thumb h-16 w-16 flex-none object-cover bg-(--surface-3)" src="' + esc(n.thumb) + '" alt="" loading="lazy" />' : '<span class="stk-news-thumb stk-news-thumb-empty block h-16 w-16 flex-none bg-(--surface-3)"></span>') +
            '<span class="stk-news-body grid min-w-0 gap-0.75"><strong class="text-[length:var(--t-subhead)] font-semibold leading-[1.3]">' + esc(n.title) + '</strong>' +
            '<span class="stk-news-meta text-[length:var(--t-caption)] text-(--ink-3)">' + esc(n.provider) + (when(n.at) ? ' · ' + when(n.at) : '') + '</span></span>' +
            '</a></li>'
        )
        .join('') +
      '</ul></section>'
    );
  }

  /** Desenha o painel a partir da cotação corrente e re-liga o gráfico. */
  function render(main, q, label, range, chartData) {
    const k = tone(q);
    const when = new Date().toLocaleTimeString(ctx.data.intlLocale, { hour: '2-digit', minute: '2-digit' });
    const ranges = RANGE_ORDER.filter((r) => t.ranges[r]);
    main.innerHTML =
      '<div class="stk-detail grid gap-4.5 px-6.5 pb-7.5 pt-5.5">' +
      '<header class="stk-title flex items-start justify-between gap-4"><div><h2 class="m-0 text-[length:var(--t-title)] font-bold tracking-[-0.02em]">' + esc(label || q.symbol) + '</h2><p class="mb-0 mt-0.5 text-[length:var(--t-subhead)] text-(--ink-3)">' + esc(q.name) + '</p></div>' +
      '<div class="stk-big grid justify-items-end gap-0.5"><span class="stk-bigprice text-[length:var(--t-large)] font-bold tracking-[-0.02em] tabular-nums" data-stk-price>' + money(q.price) + '</span>' +
      '<span class="stk-change ' + k + ' text-[length:var(--t-subhead)] font-semibold tabular-nums" data-stk-change>' + signed(q.change) + ' (' + signed(q.percent, '%') + ')</span></div></header>' +
      '<div class="seg stk-ranges justify-self-start" role="tablist">' +
      ranges.map((r) => '<button type="button" role="tab" data-range="' + r + '" aria-pressed="' + (r === range) + '">' + esc(t.ranges[r]) + '</button>').join('') +
      '</div>' +
      '<div class="stk-chart relative" data-stk-chart>' + chart(chartData ? chartData.points : q.points, k, {
        session: chartData ? chartData.session : q.session,
        previous: chartData ? chartData.previous : q.previous,
        range,
        locale: ctx.data.intlLocale,
      }) + '</div>' +
      '<dl class="stk-stats m-0 grid grid-cols-[repeat(auto-fit,minmax(150px,1fr))] gap-2.5" data-stk-stats>' +
      '<div class="stk-stats-item bg-(--surface-2) px-3 py-2.5"><dt class="text-[length:var(--t-caption)] text-(--ink-3)">' + esc(t.previous) + '</dt><dd class="mt-0.5 mb-0 text-[length:var(--t-body)] font-semibold tabular-nums">' + money(q.previous) + '</dd></div>' +
      '<div class="stk-stats-item bg-(--surface-2) px-3 py-2.5"><dt class="text-[length:var(--t-caption)] text-(--ink-3)">' + esc(t.currency) + '</dt><dd class="mt-0.5 mb-0 text-[length:var(--t-body)] font-semibold tabular-nums">' + esc(q.currency || '—') + '</dd></div>' +
      '<div class="stk-stats-item bg-(--surface-2) px-3 py-2.5"><dt class="text-[length:var(--t-caption)] text-(--ink-3)">' + esc(t.market) + '</dt><dd class="mt-0.5 mb-0 text-[length:var(--t-body)] font-semibold tabular-nums">' + esc(q.market === 'REGULAR' ? t.marketOpen : t.marketClosed) + '</dd></div>' +
      '<div class="stk-stats-item bg-(--surface-2) px-3 py-2.5"><dt class="text-[length:var(--t-caption)] text-(--ink-3)">' + esc(t.updated) + '</dt><dd class="mt-0.5 mb-0 text-[length:var(--t-body)] font-semibold tabular-nums">' + esc(when) + '</dd></div>' +
      '</dl>' +
      '<div data-stk-extra></div>' +
      '<p class="stk-source m-0 text-[length:var(--t-caption)] text-(--ink-3)">' + esc(t.source) + ' ' + esc(t.live) + '</p>' +
      '</div>';

    const chartHost = main.querySelector('[data-stk-chart]');
    const priceEl = main.querySelector('[data-stk-price]');
    const changeEl = main.querySelector('[data-stk-change]');
    const basePrice = money(q.price);
    const baseChange = signed(q.change) + ' (' + signed(q.percent, '%') + ')';
    wireChart(chartHost, chartData ? chartData.points : q.points, { session: chartData ? chartData.session : q.session, range, locale: ctx.data.intlLocale }, (point) => {
      if (!priceEl) return;
      if (point) {
        priceEl.textContent = money(point[1]);
        if (changeEl && typeof q.previous === 'number') {
          const change = point[1] - q.previous;
          const percent = q.previous ? (change / q.previous) * 100 : null;
          changeEl.textContent = signed(change) + ' (' + signed(percent, '%') + ')';
        }
      } else {
        priceEl.textContent = basePrice;
        if (changeEl) changeEl.textContent = baseChange;
      }
    });

    fetchDetails(q.symbol).then((d) => {
      const extra = main.querySelector('[data-stk-extra]');
      if (!extra) return;
      if (!d) return;
      const stats = main.querySelector('[data-stk-stats]');
      if (stats && d.stats) stats.insertAdjacentHTML('beforeend', statsGrid(d.stats));
      extra.innerHTML = aboutSection(d.profile) + newsSection(d.news);
    });
  }

  function empty(main) {
    main.innerHTML =
      '<div class="stk-empty grid h-full place-content-center justify-items-center gap-2 text-(--ink-3)"><svg class="opacity-60" viewBox="0 0 100 100" width="44" height="44" aria-hidden="true"><use href="#icon-bolsa"/></svg><p>' + esc(t.pick) + '</p></div>';
  }

  return { render, empty, ranges: RANGE_ORDER };
}
