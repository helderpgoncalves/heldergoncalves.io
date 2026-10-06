import { percentagem } from './formato';
import { fase } from './wsb';

// A escala: de PAPER HANDS (−50%) à meta (+50%). O marcador mostra a performance; a barra enche
// da esquerda até lá, do vermelho das mãos de papel ao verde e ao dourado da meta.

const DE = -50;
const ATE = 50;
const PERCURSO = 'linear-gradient(90deg,#fb7185 0%,#fb923c 18%,#facc15 36%,#a5b4cf 50%,#34d399 66%,#a3e635 84%,#fbbf24 100%)';
const MARCAS = [-50, -25, 0, 25, 50];
const TAMANHO = 'text-[clamp(1.35rem,min(7vw,5.8svh),3.8rem)]';

type Props = { performance: number | null; faltam: number | null; meta: number };

export function Escala({ performance, faltam, meta }: Props) {
  const posicao = performance === null ? 0 : Math.min(100, Math.max(0, ((performance - DE) / (ATE - DE)) * 100));
  const atingida = performance !== null && performance >= meta;
  const noFundo = performance !== null && performance <= DE;
  const f = fase(performance);

  return (
    <section aria-label={performance === null ? 'Escala de performance' : `Performance de ${percentagem(performance)} numa escala de −50% a +50%`}>
      <div className="flex items-end justify-between gap-3">
        <div className="min-w-0">
          <p className={`font-serif ${TAMANHO} leading-none tracking-[-0.02em] ${noFundo ? 'msft-meta' : ''}`}>
            <span className="bg-[linear-gradient(90deg,#fb7185,#fb923c)] bg-clip-text text-transparent">PAPER HANDS</span> <span aria-hidden>🧻</span>
          </p>
          <p className="mt-2 font-mono text-[0.68rem] tracking-[0.12em] text-nevoa/45 uppercase">−50%<span className="hidden sm:inline"> · vendeste no fundo</span></p>
        </div>
        <div className="shrink-0 text-right">
          <p className={`font-serif ${TAMANHO} leading-none tracking-[-0.02em] whitespace-nowrap text-[#fbbf24] ${atingida ? 'msft-meta' : ''}`}><span aria-hidden>🚀</span> 50%</p>
          <p className="mt-2 font-mono text-[0.68rem] tracking-[0.12em] text-nevoa/45 uppercase">performance<span className="hidden sm:inline"> · diamond hands 💎</span></p>
        </div>
      </div>

      <div className="relative mt-12 mb-[3.4rem] tela:mt-11 tela:mb-[3.1rem]">
        <div className="relative h-3.5 rounded-full bg-white/[0.07]">
          <div className="msft-enchimento absolute inset-0 rounded-full" style={{ background: PERCURSO, clipPath: `inset(0 ${100 - posicao}% 0 0 round 999px)` }} />
        </div>

        {performance !== null && (
          <>
            {/* O balão fica sempre inteiro dentro da barra, mesmo nos extremos. */}
            <span
              className="msft-marcador absolute bottom-[calc(100%+0.95rem)] flex -translate-x-1/2 items-center gap-1.5 rounded-xl bg-nevoa px-2.5 py-1 font-mono text-[0.82rem] font-medium whitespace-nowrap text-noite shadow-[0_8px_30px_-6px_#000]"
              style={{ left: `clamp(3.4rem, ${posicao}%, calc(100% - 3.4rem))` }}
            >
              <span aria-hidden className="text-[1.05rem] leading-none">{f.emoji}</span>
              {percentagem(performance, 1)}
            </span>
            <span className="msft-marcador absolute -top-1 block h-[1.4rem] w-[1.4rem] -translate-x-1/2" style={{ left: `${posicao}%` }}>
              <span className="msft-ping absolute inset-0 rounded-full bg-nevoa" />
              <span className="absolute inset-0 rounded-full border-[3px] border-noite bg-nevoa shadow-[0_0_0_2px_#e8ecf4,0_0_24px_#e8ecf4aa]" />
            </span>
          </>
        )}

        <div className="pointer-events-none absolute inset-x-0 top-5 h-8" aria-hidden>
          {MARCAS.map((m) => {
            const pos = ((m - DE) / (ATE - DE)) * 100;
            const borda = m === DE ? 'left-0' : m === ATE ? 'right-0' : '-translate-x-1/2';
            return (
              <span key={m} className={`absolute font-mono text-[0.66rem] text-nevoa/40 ${borda}`} style={m === DE || m === ATE ? undefined : { left: `${pos}%` }}>
                <span className={`mb-1 block h-1.5 w-px bg-nevoa/25 ${m === ATE ? 'ml-auto' : m === DE ? '' : 'mx-auto'}`} />
                {m > 0 ? `+${m}` : m}%
              </span>
            );
          })}
        </div>
      </div>

      {performance !== null && <p className="mb-2 text-center font-mono text-[0.78rem] tracking-[0.03em] text-nevoa/60"><span aria-hidden>{f.emoji}</span> {f.frase}</p>}
      <p className="text-center font-serif text-[clamp(1.2rem,min(5vw,3.4svh),1.8rem)] leading-tight text-balance">
        {performance === null ? (
          <span className="text-nevoa/60">A posição ainda não está configurada.</span>
        ) : atingida ? (
          <span className="msft-meta bg-[linear-gradient(90deg,#34d399,#a3e635,#fbbf24)] bg-clip-text text-transparent">Meta atingida. 🎉</span>
        ) : (
          <>
            Faltam <span className="text-[#fbbf24]">{percentagem(faltam ?? 0).replace('+', '')}</span> de subida para os {meta}%
          </>
        )}
      </p>
    </section>
  );
}
