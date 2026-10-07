'use client';

import { useEffect, useRef, useState } from 'react';
import type { Estado } from '@/lib/microsoft/tipos';
import { Chat } from './Chat';
import { Escala } from './Escala';
import { Grafico } from './Grafico';
import { dataHora, moeda, percentagem } from './formato';
import { useAlturaVisivel } from './useAlturaVisivel';
import { useTempoReal } from './useTempoReal';
import './microsoft.css';

type Vista = 'preco' | 'chat';

// Desktop: uma só vista, sem scroll — o painel à esquerda, o chat ao lado.
// Telemóvel e tablet: uma app com duas abas (Preço | Chat), de altura fixa, com o chat a ecrã inteiro.
export function Painel({ inicial }: { inicial: Estado }) {
  const { estado, ligado, acoes } = useTempoReal(inicial);
  const c = estado.cotacao;
  useAlturaVisivel();

  // A aba abre-se pelo endereço (#chat), para poderes partilhar a ligação directa ao chat.
  const [vista, setVista] = useState<Vista>('preco');
  useEffect(() => { if (location.hash === '#chat') setVista('chat'); }, []);
  const mudar = (v: Vista) => { setVista(v); history.replaceState(null, '', v === 'chat' ? '#chat' : location.pathname + location.search); };

  // Mensagens que chegam com a aba do chat fechada.
  const [novas, setNovas] = useState(0);
  const vistas = useRef(estado.comentarios.length);
  useEffect(() => {
    const n = estado.comentarios.length;
    if (vista !== 'chat' && n > vistas.current) setNovas((x) => x + (n - vistas.current));
    vistas.current = n;
  }, [estado.comentarios.length, vista]);
  useEffect(() => { if (vista === 'chat') setNovas(0); }, [vista]);

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
    <main className="msft-raiz h-[var(--app-h,100dvh)] overflow-hidden bg-noite text-nevoa [--p-acento:#aab8ff] [touch-action:manipulation]">
      <div className="mx-auto flex h-full max-w-[100rem] flex-col tela:grid tela:grid-cols-[minmax(0,1.2fr)_minmax(24rem,0.8fr)] tela:gap-12 tela:px-10 tela:pt-6 tela:pb-6">
        <header className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 px-4 pt-[max(0.75rem,env(safe-area-inset-top))] font-mono text-[0.7rem] tracking-[0.1em] uppercase tela:hidden">
          <p className="text-nevoa/55">🦍 MSFT YOLO · MSF.F</p>
          {c && <SinalDeVida aberto={c.aberto} ligado={ligado} parado={c.paradoHaMin} />}
        </header>

        <div role="tablist" aria-label="Vista" className="mx-4 mt-3 mb-2 flex gap-1 rounded-2xl bg-white/[0.07] p-1 tela:hidden">
          <Aba ativa={vista === 'preco'} id="preco" aoEscolher={() => mudar('preco')}>📈 Preço</Aba>
          <Aba ativa={vista === 'chat'} id="chat" aoEscolher={() => mudar('chat')} contador={novas}>🦍 Chat</Aba>
        </div>

        <section
          id="painel-preco" role="tabpanel" aria-labelledby="aba-preco"
          className={`min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain px-4 pt-2 pb-[max(1rem,env(safe-area-inset-bottom))] ${vista === 'preco' ? 'flex' : 'hidden'} tela:flex tela:overflow-visible tela:p-0`}
        >
          <header className="hidden items-center justify-between gap-4 font-mono text-[0.72rem] tracking-[0.12em] uppercase tela:flex">
            <p className="text-nevoa/55">🦍 MSFT YOLO · MSF.F</p>
            {c && <SinalDeVida aberto={c.aberto} ligado={ligado} parado={c.paradoHaMin} />}
          </header>

          <h1 className="mt-2 font-serif text-[clamp(1.9rem,min(7.4vw,5svh),3.2rem)] leading-[1] tracking-[-0.03em] text-balance tela:mt-[2.2svh]">Quanto falta para os 50%?</h1>

          {c ? (
            <>
              <p className="mt-3 flex flex-wrap items-baseline gap-x-4 gap-y-0.5 tela:mt-[2.4svh]">
                <span key={piscar?.n ?? 0} className={`font-serif text-[clamp(3rem,min(15vw,10svh),6rem)] leading-none tracking-[-0.03em] tabular-nums ${piscar ? `msft-${piscar.cor}` : ''}`}>
                  {moeda(c.preco, c.moeda)}
                </span>
                {piscar && <span key={`e${piscar.n}`} aria-hidden className="msft-sobe-emoji text-[1.6rem]">{piscar.cor === 'sobe' ? '🚀' : '🧻'}</span>}
                <span className={`font-mono text-[0.88rem] tabular-nums ${Math.abs(diaPct) < 0.005 ? 'text-nevoa/55' : dia > 0 ? 'text-[#34d399]' : 'text-[#fb7185]'}`}>
                  {Math.abs(diaPct) < 0.005 ? '▬' : dia > 0 ? '▲' : '▼'} {percentagem(diaPct)} <span className="text-nevoa/40">{c.aberto ? 'hoje' : 'na última sessão'}</span>
                </span>
              </p>
              <p className="mt-1 font-mono text-[0.7rem] text-nevoa/40">último negócio {dataHora(c.hora)}</p>

              <div className="mt-6 tela:mt-[3.4svh]"><Escala performance={c.performance} faltam={c.faltam} meta={c.meta} /></div>

              <div className="mt-5 min-h-[9rem] flex-1 tela:mt-[2.6svh] tela:min-h-0">
                <Grafico serie={c.serie} anterior={c.anterior} moedaCodigo={c.moeda} />
              </div>
            </>
          ) : (
            <p className="mt-10 rounded-2xl border border-white/10 p-6 text-nevoa/60">Não consegui obter a cotação neste momento. A página volta a tentar sozinha.</p>
          )}
        </section>

        <div id="painel-chat" role="tabpanel" aria-labelledby="aba-chat" className={`min-h-0 flex-1 flex-col ${vista === 'chat' ? 'flex' : 'hidden'} tela:flex tela:h-full`}>
          <Chat comentarios={estado.comentarios} online={estado.online} ligado={ligado} acoes={acoes} />
        </div>
      </div>
    </main>
  );
}

function Aba({ id, ativa, aoEscolher, contador = 0, children }: { id: string; ativa: boolean; aoEscolher: () => void; contador?: number; children: React.ReactNode }) {
  return (
    <button
      id={`aba-${id}`} role="tab" type="button" aria-selected={ativa} aria-controls={`painel-${id}`} onClick={aoEscolher}
      className={`relative flex h-11 flex-1 items-center justify-center gap-2 rounded-xl text-base font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nevoa ${ativa ? 'bg-nevoa text-noite' : 'text-nevoa/70 active:bg-white/10'}`}
    >
      {children}
      {contador > 0 && <span aria-label={`${contador} mensagens novas`} className="grid h-5 min-w-5 place-items-center rounded-full bg-[#fb7185] px-1.5 font-mono text-[0.7rem] font-semibold text-noite tabular-nums">{contador > 99 ? '99+' : contador}</span>}
    </button>
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
