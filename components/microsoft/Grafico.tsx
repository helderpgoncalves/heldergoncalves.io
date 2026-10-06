import type { Ponto } from '@/lib/microsoft/tipos';
import { hora, moeda } from './formato';

const L = 640;
const A = 200;

// O dia em linha, com dados reais: verde se está acima do fecho de ontem, vermelho se abaixo.
// A linha a tracejado é o fecho de ontem. O gráfico ocupa a altura que o contentor lhe der.
export function Grafico({ serie, anterior, moedaCodigo }: { serie: Ponto[]; anterior: number; moedaCodigo: string }) {
  if (serie.length < 2) {
    return <p className="grid h-full min-h-[6rem] place-items-center rounded-2xl border border-white/10 font-mono text-[0.8rem] text-nevoa/45">Ainda sem negócios hoje.</p>;
  }
  const precos = serie.map((p) => p[1]);
  const min = Math.min(anterior, ...precos);
  const max = Math.max(anterior, ...precos);
  const folga = (max - min || 1) * 0.14;
  const lo = min - folga;
  const hi = max + folga;
  const t0 = serie[0][0];
  const t1 = serie.at(-1)![0];
  const px = (t: number) => (t1 === t0 ? 100 : ((t - t0) / (t1 - t0)) * 100);
  const py = (p: number) => 100 - ((p - lo) / (hi - lo)) * 100;

  const linha = serie.map((p, i) => `${i ? 'L' : 'M'}${(px(p[0]) * L / 100).toFixed(1)} ${(py(p[1]) * A / 100).toFixed(1)}`).join(' ');
  const [tu, pu] = serie.at(-1)!;
  const sobe = pu >= anterior;
  const cor = sobe ? '#34d399' : '#fb7185';

  return (
    <figure className="flex h-full min-h-[6rem] flex-col">
      <figcaption className="mb-2 flex flex-wrap justify-between gap-x-4 font-mono text-[0.7rem] text-nevoa/45">
        <span>fecho de ontem {moeda(anterior, moedaCodigo)}</span>
        <span>máx {moeda(Math.max(...precos), moedaCodigo)} · mín {moeda(Math.min(...precos), moedaCodigo)}</span>
      </figcaption>
      <div className="relative min-h-0 flex-1">
        <svg viewBox={`0 0 ${L} ${A}`} preserveAspectRatio="none" className="absolute inset-0 h-full w-full" role="img" aria-label={`Gráfico do dia: ${sobe ? 'acima' : 'abaixo'} do fecho de ontem`}>
          <defs>
            <linearGradient id="msft-area" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor={cor} stopOpacity="0.26" />
              <stop offset="1" stopColor={cor} stopOpacity="0" />
            </linearGradient>
          </defs>
          <line x1="0" x2={L} y1={py(anterior) * A / 100} y2={py(anterior) * A / 100} stroke="#e8ecf4" strokeOpacity="0.28" strokeDasharray="4 5" vectorEffect="non-scaling-stroke" />
          <path d={`${linha} L${(px(tu) * L / 100).toFixed(1)} ${A} L0 ${A} Z`} fill="url(#msft-area)" />
          <path d={linha} fill="none" stroke={cor} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
        </svg>
        <span aria-hidden className="absolute -translate-x-1/2 -translate-y-1/2" style={{ left: `${px(tu)}%`, top: `${py(pu)}%` }}>
          <span className="msft-ping absolute inset-0 rounded-full" style={{ background: cor }} />
          <span className="relative block h-2.5 w-2.5 rounded-full" style={{ background: cor }} />
        </span>
      </div>
      <p className="mt-1.5 flex justify-between font-mono text-[0.68rem] text-nevoa/35"><span>{hora(t0)}</span><span>{hora(t1)}</span></p>
    </figure>
  );
}
