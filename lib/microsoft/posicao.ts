import type { Cotacao } from './cotacao';
import type { CotacaoPublica } from './tipos';

// A meta: lucro de 50% sobre o custo médio de compra.
const META = 50;

// O custo médio (em euros) é uma variável de ambiente do servidor: são dados financeiros,
// por isso nunca entram no repositório.
const custoMedio = Number(process.env.MSFT_CUSTO_MEDIO);
const posicaoConfigurada = Number.isFinite(custoMedio) && custoMedio > 0;

/** Passa a cotação do servidor ao que o browser pode ver, já com a performance calculada. */
export function publicar(c: Cotacao, agora = Date.now() / 1000): Omit<CotacaoPublica, 'serie'> {
  const aberto = agora >= c.abre && agora <= c.fecha;
  const parado = aberto ? Math.floor((agora - c.hora) / 60) : 0;
  return {
    preco: c.preco,
    moeda: c.moeda,
    anterior: c.anterior,
    max: c.max,
    min: c.min,
    hora: c.hora,
    aberto,
    paradoHaMin: parado >= 15 ? parado : null,
    performance: posicaoConfigurada ? (c.preco / custoMedio - 1) * 100 : null,
    faltam: posicaoConfigurada ? Math.max(0, ((1 + META / 100) * custoMedio / c.preco - 1) * 100) : null,
    meta: META,
  };
}
