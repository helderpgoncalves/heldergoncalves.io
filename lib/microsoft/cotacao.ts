import type { Ponto } from './tipos';

// A posição é em acções da Microsoft cotadas em Frankfurt (MSF.F, em euros): é o que o portefólio tem,
// por isso é com este preço, na mesma moeda, que se compara o custo médio.
const SIMBOLO = 'MSF.F';

export type Cotacao = {
  preco: number;
  moeda: string;
  anterior: number;
  max: number | null;
  min: number | null;
  hora: number;
  abre: number;
  fecha: number;
  serie: Ponto[];
};

type Bruto = {
  chart?: {
    result?: {
      meta: {
        currency: string; regularMarketPrice: number; chartPreviousClose: number; regularMarketTime: number;
        regularMarketDayHigh?: number; regularMarketDayLow?: number;
        currentTradingPeriod: { regular: { start: number; end: number } };
      };
      timestamp?: number[];
      indicators?: { quote?: { close?: (number | null)[] }[] };
    }[];
  };
};

// O Yahoo tem dois nomes para o mesmo serviço; YAHOO_URL aponta para um servidor-falso nos testes.
const BASES = process.env.YAHOO_URL ? [process.env.YAHOO_URL] : ['https://query1.finance.yahoo.com', 'https://query2.finance.yahoo.com'];
const MAX_PONTOS = 300;

const numero = (n: unknown): n is number => typeof n === 'number' && Number.isFinite(n) && n > 0;

function ler(bruto: Bruto): Cotacao {
  const r = bruto.chart?.result?.[0];
  const m = r?.meta;
  if (!r || !m || !numero(m.regularMarketPrice) || !numero(m.chartPreviousClose) || !numero(m.regularMarketTime)) {
    throw new Error('resposta do Yahoo sem os campos esperados');
  }
  const fecho = r.indicators?.quote?.[0]?.close ?? [];
  const pontos: Ponto[] = (r.timestamp ?? []).flatMap((t, i) => (numero(fecho[i]) ? [[t, fecho[i] as number] as Ponto] : []));
  // Menos pontos para o gráfico: o que interessa é a forma do dia.
  const passo = Math.max(1, Math.ceil(pontos.length / MAX_PONTOS));
  const serie = pontos.filter((_, i) => i % passo === 0 || i === pontos.length - 1);
  if (!serie.length || serie[serie.length - 1][0] < m.regularMarketTime) serie.push([m.regularMarketTime, m.regularMarketPrice]);

  return {
    preco: m.regularMarketPrice,
    moeda: m.currency,
    anterior: m.chartPreviousClose,
    max: numero(m.regularMarketDayHigh) ? m.regularMarketDayHigh : null,
    min: numero(m.regularMarketDayLow) ? m.regularMarketDayLow : null,
    hora: m.regularMarketTime,
    abre: m.currentTradingPeriod.regular.start,
    fecha: m.currentTradingPeriod.regular.end,
    serie,
  };
}

export async function buscarCotacao(): Promise<Cotacao> {
  let erro: unknown;
  for (const base of BASES) {
    try {
      const r = await fetch(`${base}/v8/finance/chart/${SIMBOLO}?range=1d&interval=1m`, {
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; helder.si)', Accept: 'application/json' },
        signal: AbortSignal.timeout(8000),
        cache: 'no-store',
      });
      if (!r.ok) throw new Error(`Yahoo respondeu ${r.status}`);
      return ler((await r.json()) as Bruto);
    } catch (e) {
      erro = e;
    }
  }
  throw erro;
}
