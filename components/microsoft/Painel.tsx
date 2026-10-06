'use client';

import { useEffect, useRef, useState } from 'react';
import type { Estado } from '@/lib/microsoft/tipos';
import { Chat } from './Chat';
import { Escala } from './Escala';
import { Grafico } from './Grafico';
import { dataHora, moeda, percentagem } from './formato';
import { useTempoReal } from './useTempoReal';
import './microsoft.css';

// Desktop: uma só vista, sem scroll — o painel à esquerda, o chat ao lado. Telemóvel: uma coluna.
export function Painel({ inicial }: { inicial: Estado }) {
  const { estado, ligado, acoes } = useTempoReal(inicial);
  const c = estado.cotacao;

  // Cada vez que o preço muda, pisca a verde (sobe) ou a vermelho (desce).
  const anterior = useRef(c?.preco);
  const [piscar, setPiscar] = useState<{ cor: 'sobe' | 'desce'; n: number } | null>(null);
  useEffect(() => {
    if (c && anterior.current !== undefined && c.preco !== anterior.current) {
      setPiscar((p) => ({ cor: c.preco > anterior.current! ? 'sobe' : 'desce', n: (p?.n ?? 0) + 1 }));
    }
    anterior.current = c?.preco;
  }, [c?.preco]);

  const dia = c ? c.preco - c.anterior : 0;
  const diaPct = c ? (dia / c.anterior) * 100 : 0;

  return (
    <main className="bg-noite text-nevoa [--p-acento:#aab8ff] tela:h-svh tela:overflow-hidden">
      <div className="mx-auto grid max-w-[100rem] gap-8 px-4 pt-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:gap-10 sm:px-8 sm:pt-8 tela:h-full tela:grid-cols-[minmax(0,1.2fr)_minmax(24rem,0.8fr)] tela:gap-12 tela:px-10 tela:pt-6 tela:pb-6">
        <section className="flex min-h-0 flex-col">
          <header className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 font-mono text-[0.7rem] tracking-[0.1em] uppercase sm:text-[0.72rem] sm:tracking-[0.12em]">
            <p className="text-nevoa/55">🦍 MSFT YOLO · MSF.F</p>
            {c && <SinalDeVida aberto={c.aberto} ligado={ligado} parado={c.paradoHaMin} />}
          </header>

          <h1 className="mt-5 font-serif text-[clamp(1.9rem,min(7vw,5.2svh),3.2rem)] leading-[1] tracking-[-0.03em] text-balance tela:mt-[2.2svh]">Quanto falta para os 50%?</h1>

          {c ? (
            <>
              <p className="mt-4 flex flex-wrap items-baseline gap-x-5 gap-y-1 tela:mt-[2.4svh]">
                <span key={piscar?.n ?? 0} className={`font-serif text-[clamp(3rem,min(14vw,11svh),6rem)] leading-none tracking-[-0.03em] tabular-nums ${piscar ? `msft-${piscar.cor}` : ''}`}>
                  {moeda(c.preco, c.moeda)}
                </span>
                {piscar && <span key={`e${piscar.n}`} aria-hidden className="msft-sobe-emoji text-[1.6rem]">{piscar.cor === 'sobe' ? '🚀' : '🧻'}</span>}
                <span className={`font-mono text-[0.9rem] tabular-nums ${Math.abs(diaPct) < 0.005 ? 'text-nevoa/55' : dia > 0 ? 'text-[#34d399]' : 'text-[#fb7185]'}`}>
                  {Math.abs(diaPct) < 0.005 ? '▬' : dia > 0 ? '▲' : '▼'} {percentagem(diaPct)} <span className="text-nevoa/40">{c.aberto ? 'hoje' : 'na última sessão'}</span>
                </span>
              </p>
              <p className="mt-1.5 font-mono text-[0.72rem] text-nevoa/40">último negócio {dataHora(c.hora)}</p>

              <div className="mt-8 tela:mt-[3.4svh]"><Escala performance={c.performance} faltam={c.faltam} meta={c.meta} /></div>

              <div className="mt-8 h-56 tela:mt-[2.6svh] tela:h-auto tela:min-h-0 tela:flex-1">
                <Grafico serie={c.serie} anterior={c.anterior} moedaCodigo={c.moeda} />
              </div>
            </>
          ) : (
            <p className="mt-10 rounded-2xl border border-white/10 p-6 text-nevoa/60">Não consegui obter a cotação neste momento. A página volta a tentar sozinha.</p>
          )}
        </section>

        <div className="h-[min(38rem,86svh)] min-h-[26rem] tela:h-full tela:min-h-0">
          <Chat comentarios={estado.comentarios} online={estado.online} ligado={ligado} acoes={acoes} />
        </div>
      </div>
    </main>
  );
}

function SinalDeVida({ aberto, ligado, parado }: { aberto: boolean; ligado: boolean; parado: number | null }) {
  const [texto, cor] = !aberto ? ['Mercado fechado', '#94a3b8'] : !ligado ? ['A reconectar…', '#fbbf24'] : parado ? [`Sem negócios há ${parado} min`, '#fbbf24'] : ['Ao vivo', '#34d399'];
  return (
    <p className="flex items-center gap-2" style={{ color: cor }}>
      <span className="relative flex h-2 w-2">
        {aberto && ligado && !parado && <span className="msft-ping absolute inset-0 rounded-full" style={{ background: cor }} />}
        <span className="relative h-2 w-2 rounded-full" style={{ background: cor }} />
      </span>
      {texto}
    </p>
  );
}
