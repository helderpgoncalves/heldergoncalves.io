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
    return rows.map(([key, value]) => '<div><dt>' + esc(t.stats[key]) + '</dt><dd>' + esc(value) + '</dd></div>').join('');
  }

  function aboutSection(profile) {
    if (!profile || (!profile.summary && !profile.sector)) return '';
    const meta = [profile.sector, profile.industry].filter(Boolean).join(' · ');
    return (
      '<section class="stk-about">' +
      '<h3>' + esc(t.about) + '</h3>' +
      (meta ? '<p class="stk-about-meta">' + esc(meta) + '</p>' : '') +
      (profile.summary ? '<p class="stk-about-text">' + esc(profile.summary) + '</p>' : '') +
      (profile.website ? '<a class="stk-about-link" href="' + esc(profile.website) + '" target="_blank" rel="noopener">' + esc(t.visitWebsite) + '</a>' : '') +
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
      '<h3>' + esc(t.news) + '</h3>' +
      '<ul class="stk-news-list">' +
      news
        .map(
          (n) =>
            '<li><a href="' + esc(n.url) + '" target="_blank" rel="noopener">' +
            (n.thumb ? '<img class="stk-news-thumb" src="' + esc(n.thumb) + '" alt="" loading="lazy" />' : '<span class="stk-news-thumb stk-news-thumb-empty"></span>') +
            '<span class="stk-news-body"><strong>' + esc(n.title) + '</strong>' +
            '<span class="stk-news-meta">' + esc(n.provider) + (when(n.at) ? ' · ' + when(n.at) : '') + '</span></span>' +
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
      '<div class="stk-detail">' +
      '<header class="stk-title"><div><h2>' + esc(label || q.symbol) + '</h2><p>' + esc(q.name) + '</p></div>' +
      '<div class="stk-big"><span class="stk-bigprice" data-stk-price>' + money(q.price) + '</span>' +
      '<span class="stk-change ' + k + '" data-stk-change>' + signed(q.change) + ' (' + signed(q.percent, '%') + ')</span></div></header>' +
      '<div class="seg stk-ranges" role="tablist">' +
      ranges.map((r) => '<button type="button" role="tab" data-range="' + r + '" aria-pressed="' + (r === range) + '">' + esc(t.ranges[r]) + '</button>').join('') +
      '</div>' +
      '<div class="stk-chart" data-stk-chart>' + chart(chartData ? chartData.points : q.points, k, {
        session: chartData ? chartData.session : q.session,
        previous: chartData ? chartData.previous : q.previous,
        range,
        locale: ctx.data.intlLocale,
      }) + '</div>' +
      '<dl class="stk-stats" data-stk-stats>' +
      '<div><dt>' + esc(t.previous) + '</dt><dd>' + money(q.previous) + '</dd></div>' +
      '<div><dt>' + esc(t.currency) + '</dt><dd>' + esc(q.currency || '—') + '</dd></div>' +
      '<div><dt>' + esc(t.market) + '</dt><dd>' + esc(q.market === 'REGULAR' ? t.marketOpen : t.marketClosed) + '</dd></div>' +
      '<div><dt>' + esc(t.updated) + '</dt><dd>' + esc(when) + '</dd></div>' +
      '</dl>' +
      '<div data-stk-extra></div>' +
      '<p class="stk-source">' + esc(t.source) + ' ' + esc(t.live) + '</p>' +
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
      '<div class="stk-empty"><svg viewBox="0 0 100 100" width="44" height="44" aria-hidden="true"><use href="#icon-bolsa"/></svg><p>' + esc(t.pick) + '</p></div>';
  }

  return { render, empty, ranges: RANGE_ORDER };
}
