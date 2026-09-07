// ─────────────────────────────────────────────────────────────────────
// A Bolsa: cotações ao vivo, através do servidor.
//
// O browser não fala com a fonte directamente — a política de segurança
// não deixa, e é assim que deve ser. Pede aqui, e o servidor pergunta à
// API da Bolsa (api/, em Python, na rede interna), que é quem fala com o
// Yahoo Finance e guarda as respostas. Sem a API configurada, o
// servidor vai ele próprio ao gráfico do Yahoo — ficam as cotações e as
// séries; a ficha e a procura respondem «indisponível».
//
//   GET /api/bolsa?s=AAPL,MSFT&r=1d   as cotações e a série de cada um
//   GET /api/bolsa/detalhe?s=AAPL     estatísticas, perfil e notícias
//   GET /api/bolsa/procurar?q=apple   símbolos por nome ou sigla
//
// Nada do que vem de fora entra sem ser conferido: os símbolos têm uma
// forma fixa, o intervalo é de uma lista, e o que se devolve ao browser
// é só o que a aplicação usa — números e nomes, não o JSON todo.
// ─────────────────────────────────────────────────────────────────────
import { LIMITS, STOCKS, stocksApiReady } from '../config.mjs';
import { json, oneLine } from '../http.mjs';
import { bump, ipKey } from '../security.mjs';

// O primeiro carácter também pode ser '^': é assim que o Yahoo escreve
// um índice — '^GSPC' é o S&P 500, e está na lista por omissão.
const SYMBOL_RE = /^[A-Z0-9^][A-Z0-9.=^-]{0,11}$/;

/** Os intervalos que a aplicação mostra, e como se pedem ao Yahoo directo. */
const RANGES = {
  '1d': { range: '1d', interval: '5m' },
  '1w': { range: '5d', interval: '30m' },
  '1m': { range: '1mo', interval: '1h' },
  '3m': { range: '3mo', interval: '1d' },
  '6m': { range: '6mo', interval: '1d' },
  ytd: { range: 'ytd', interval: '1d' },
  '1y': { range: '1y', interval: '1d' },
  '2y': { range: '2y', interval: '1wk' },
  '5y': { range: '5y', interval: '1wk' },
  all: { range: 'max', interval: '1mo' },
};

const cache = new Map();

const rangeOf = (url) => (RANGES[url.searchParams.get('r') || '1d'] ? url.searchParams.get('r') || '1d' : '1d');
const symbolsOf = (raw) =>
  String(raw || '')
    .toUpperCase()
    .split(',')
    .map((s) => s.trim())
    .filter((s) => SYMBOL_RE.test(s))
    .filter((s, i, all) => all.indexOf(s) === i)
    .slice(0, LIMITS.stocksPerRequest);

function withinLimits(req, res, name, window, max) {
  const key = ipKey(req);
  if (!bump(name + ':' + key, window, max)) return json(res, 429, { ok: false, error: 'limite' });
  if (!bump(name + ':global', LIMITS.stocksGlobalWindow, LIMITS.stocksGlobal))
    return json(res, 429, { ok: false, error: 'limite' });
  return null;
}

// ── A API da Bolsa ───────────────────────────────────────────────────
/** Pergunta à API e devolve o JSON, ou null se ela não responder. */
async function ask(path) {
  if (!stocksApiReady) return null;
  try {
    const res = await fetch(STOCKS.api + path, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(STOCKS.timeout),
    });
    if (!res.ok) return null;
    const body = await res.json();
    return body && body.ok ? body : null;
  } catch (_) {
    return null;
  }
}

// ── O Yahoo directo, como recuo ──────────────────────────────────────
/** Só o que interessa, do que a fonte devolve. */
function shape(symbol, body) {
  const result = body && body.chart && body.chart.result && body.chart.result[0];
  if (!result || !result.meta) return null;
  const meta = result.meta;
  const closes = ((result.indicators && result.indicators.quote && result.indicators.quote[0]) || {}).close || [];
  const stamps = result.timestamp || [];
  const points = [];
  for (let i = 0; i < closes.length; i++) {
    if (typeof closes[i] === 'number') points.push([stamps[i] || 0, Number(closes[i].toFixed(4))]);
  }
  const price = typeof meta.regularMarketPrice === 'number' ? meta.regularMarketPrice : points.length ? points[points.length - 1][1] : null;
  const previous =
    typeof meta.chartPreviousClose === 'number'
      ? meta.chartPreviousClose
      : typeof meta.previousClose === 'number'
        ? meta.previousClose
        : null;
  if (price == null) return null;
  const regular = meta.currentTradingPeriod && meta.currentTradingPeriod.regular;
  const session = regular && typeof regular.start === 'number' && typeof regular.end === 'number' ? [regular.start, regular.end] : null;
  return {
    symbol,
    name: String(meta.shortName || meta.longName || symbol).slice(0, 60),
    currency: String(meta.currency || '').slice(0, 8),
    exchange: String(meta.fullExchangeName || meta.exchangeName || '').slice(0, 40),
    type: String(meta.instrumentType || '').slice(0, 16),
    price,
    previous,
    change: previous != null ? Number((price - previous).toFixed(4)) : null,
    percent: previous ? Number((((price - previous) / previous) * 100).toFixed(2)) : null,
    market: String(meta.marketState || '').slice(0, 12),
    session,
    marketCap: null,
    at: points.length ? points[points.length - 1][0] : Math.floor(Date.now() / 1000),
    points,
  };
}

async function fetchDirect(symbol, range) {
  const key = symbol + ':' + range;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < STOCKS.ttl) return hit.data;
  const r = RANGES[range];
  const url =
    STOCKS.source + encodeURIComponent(symbol) + '?range=' + r.range + '&interval=' + r.interval + '&includePrePost=false';
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': STOCKS.agent, Accept: 'application/json' },
      signal: AbortSignal.timeout(STOCKS.timeout),
    });
    if (!res.ok) throw new Error('http ' + res.status);
    const data = shape(symbol, await res.json());
    if (!data) throw new Error('forma');
    cache.set(key, { at: Date.now(), data });
    if (cache.size > STOCKS.cacheMax) cache.delete(cache.keys().next().value);
    return data;
  } catch (_) {
    // Uma resposta velha vale mais do que nenhuma.
    return hit ? hit.data : null;
  }
}

// ── As rotas ─────────────────────────────────────────────────────────
export async function handleBolsa(req, res, url) {
  const blocked = withinLimits(req, res, 'bolsa', LIMITS.stocksPerIpWindow, LIMITS.stocksPerIp);
  if (blocked) return blocked;
  const range = rangeOf(url);
  const symbols = symbolsOf(url.searchParams.get('s'));
  if (!symbols.length) return json(res, 400, { ok: false, error: 'simbolos' });

  let quotes = null;
  if (range === '1d') {
    const body = await ask('/quotes?symbols=' + encodeURIComponent(symbols.join(',')));
    if (body && Array.isArray(body.quotes)) quotes = body.quotes;
  } else {
    // Fora do dia a série é de um título de cada vez: é assim que a aplicação pede.
    const bodies = await Promise.all(symbols.map((s) => ask('/chart/' + encodeURIComponent(s) + '?range=' + range)));
    if (bodies.every(Boolean)) quotes = bodies;
  }
  if (!quotes) quotes = (await Promise.all(symbols.map((s) => fetchDirect(s, range)))).filter(Boolean);
  return json(res, 200, { ok: true, range, at: Date.now(), source: stocksApiReady ? 'api' : 'yahoo', quotes });
}

export async function handleBolsaDetalhe(req, res, url) {
  const blocked = withinLimits(req, res, 'bolsa', LIMITS.stocksPerIpWindow, LIMITS.stocksPerIp);
  if (blocked) return blocked;
  const [symbol] = symbolsOf(url.searchParams.get('s'));
  if (!symbol) return json(res, 400, { ok: false, error: 'simbolos' });
  if (!stocksApiReady) return json(res, 503, { ok: false, error: 'indisponivel' });
  const body = await ask('/details/' + encodeURIComponent(symbol));
  if (!body) return json(res, 404, { ok: false, error: 'simbolo' });
  return json(res, 200, { ok: true, symbol, stats: body.stats || {}, profile: body.profile || {}, news: Array.isArray(body.news) ? body.news : [] });
}

export async function handleBolsaProcura(req, res, url) {
  const blocked = withinLimits(req, res, 'bolsa-procura', LIMITS.stocksSearchWindow, LIMITS.stocksSearchPerIp);
  if (blocked) return blocked;
  const q = oneLine(url.searchParams.get('q'), LIMITS.stocksQuery);
  if (!q) return json(res, 400, { ok: false, error: 'procura' });
  if (!stocksApiReady) return json(res, 503, { ok: false, error: 'indisponivel' });
  const body = await ask('/search?q=' + encodeURIComponent(q));
  return json(res, 200, { ok: true, results: body && Array.isArray(body.results) ? body.results : [] });
}
