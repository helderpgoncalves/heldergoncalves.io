// ─────────────────────────────────────────────────────────────────────
// A Bolsa: cotações ao vivo, através do servidor.
//
// O browser não fala com a fonte directamente — a política de segurança
// não deixa, e é assim que deve ser. Pede aqui, e o servidor vai buscar
// ao Yahoo Finance (o gráfico intradiário, que não pede chave nenhuma)
// e guarda a resposta um minuto: cem visitantes a olhar para o mesmo
// título são um pedido lá fora, não cem.
//
//   GET /api/bolsa?s=AAPL,MSFT&r=1d     as cotações e a série de cada um
//
// Nada do que vem de fora entra sem ser conferido: os símbolos têm uma
// forma fixa, o intervalo é de uma lista, e o que se devolve ao browser
// é só o que a aplicação usa — números e nomes, não o JSON todo.
// ─────────────────────────────────────────────────────────────────────
import { LIMITS, STOCKS } from '../config.mjs';
import { json } from '../http.mjs';
import { bump, ipKey } from '../security.mjs';

const SYMBOL_RE = /^[A-Z0-9][A-Z0-9.=^-]{0,11}$/;

/** Os intervalos que a aplicação mostra, e como se pedem. */
const RANGES = {
  '1d': { range: '1d', interval: '5m' },
  '1w': { range: '5d', interval: '30m' },
  '1m': { range: '1mo', interval: '1d' },
  '3m': { range: '3mo', interval: '1d' },
  '1y': { range: '1y', interval: '1wk' },
};

const cache = new Map();

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
  return {
    symbol,
    name: String(meta.shortName || meta.longName || symbol).slice(0, 60),
    currency: String(meta.currency || '').slice(0, 8),
    price,
    previous,
    change: previous != null ? Number((price - previous).toFixed(4)) : null,
    percent: previous ? Number((((price - previous) / previous) * 100).toFixed(2)) : null,
    market: String(meta.marketState || '').slice(0, 12),
    points,
  };
}

async function fetchOne(symbol, range) {
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

export async function handleBolsa(req, res, url) {
  const key = ipKey(req);
  if (!bump('bolsa:' + key, LIMITS.stocksPerIpWindow, LIMITS.stocksPerIp))
    return json(res, 429, { ok: false, error: 'limite' });
  if (!bump('bolsa:global', LIMITS.stocksGlobalWindow, LIMITS.stocksGlobal))
    return json(res, 429, { ok: false, error: 'limite' });

  const range = RANGES[url.searchParams.get('r') || '1d'] ? url.searchParams.get('r') || '1d' : '1d';
  const symbols = String(url.searchParams.get('s') || '')
    .toUpperCase()
    .split(',')
    .map((s) => s.trim())
    .filter((s) => SYMBOL_RE.test(s))
    .slice(0, LIMITS.stocksPerRequest);
  if (!symbols.length) return json(res, 400, { ok: false, error: 'simbolos' });

  const quotes = (await Promise.all(symbols.map((s) => fetchOne(s, range)))).filter(Boolean);
  return json(res, 200, { ok: true, range, at: Date.now(), quotes });
}
