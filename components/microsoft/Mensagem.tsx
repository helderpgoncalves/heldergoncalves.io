'use client';

import { useEffect, useRef, useState, type PointerEvent } from 'react';
import { REACOES, corCss } from '@/lib/microsoft/chat';
import type { Comentario } from '@/lib/microsoft/tipos';
import { ha } from './formato';
import { toque } from './toque';

type Props = {
  c: Comentario;
  agora: number | null;
  minhas: string[];
  meu: boolean;
  aoReagir: (emoji: string) => void;
  aoApagar: () => void;
};

// Um balão de chat: as tuas mensagens à direita, as dos outros à esquerda, com avatar.
// Reagir: toca no ＋ e escolhe, ou toca duas vezes na mensagem para dar logo um 🚀.
export function Mensagem({ c, agora, minhas, meu, aoReagir, aoApagar }: Props) {
  const [escolher, setEscolher] = useState(false);
  const [confirmar, setConfirmar] = useState(false);

  // "Apagar" pede confirmação, e desfaz-se sozinho: um toque sem querer não apaga nada.
  useEffect(() => {
    if (!confirmar) return;
    const t = setTimeout(() => setConfirmar(false), 3500);
    return () => clearTimeout(t);
  }, [confirmar]);

  const reagir = (e: string) => { toque(); aoReagir(e); setEscolher(false); };

  // Duplo toque = 🚀. No telemóvel detectamo-lo nós (o iOS nem sempre envia `dblclick` ao toque); no rato, o `dblclick`.
  // Um e outro nunca contam duas vezes, e o duplo clique não selecciona a palavra.
  const ultimoToque = useRef<{ t: number; x: number; y: number } | null>(null);
  const tratadoEm = useRef(0);
  const aoLevantar = (e: PointerEvent) => {
    if (e.pointerType === 'mouse') return;
    const l = ultimoToque.current;
    if (l && e.timeStamp - l.t < 320 && Math.hypot(e.clientX - l.x, e.clientY - l.y) < 24) {
      ultimoToque.current = null; tratadoEm.current = Date.now(); reagir('🚀');
    } else ultimoToque.current = { t: e.timeStamp, x: e.clientX, y: e.clientY };
  };
  const comReaccoes = REACOES.filter((e) => (c.reacoes[e] ?? 0) > 0 || minhas.includes(e));

  return (
    <li className={`msft-entra flex items-end gap-2 ${meu ? 'flex-row-reverse' : ''}`}>
      <span aria-hidden className="mb-6 grid h-9 w-9 shrink-0 place-items-center rounded-full text-[1.2rem]" style={{ background: corCss(c.cor) }}>{c.avatar}</span>
      <div className={`flex min-w-0 max-w-[85%] flex-col ${meu ? 'items-end' : 'items-start'}`}>
        {!meu && <span className="mb-0.5 px-1 text-[0.82rem] font-medium text-nevoa/80">{c.nome}</span>}
        <p
          onPointerUp={aoLevantar}
          onDoubleClick={() => { if (Date.now() - tratadoEm.current > 700) reagir('🚀'); }}
          onMouseDown={(e) => { if (e.detail > 1) e.preventDefault(); }}
          className={`rounded-2xl px-3.5 py-2 break-words whitespace-pre-wrap select-text ${meu ? 'rounded-br-md bg-[#22406b] text-nevoa' : 'rounded-bl-md bg-white/[0.07] text-nevoa/90'}`}
        >{c.texto}</p>

        <div className={`mt-1 flex flex-wrap items-center gap-1 ${meu ? 'justify-end' : ''}`}>
          {comReaccoes.map((e) => {
            const n = c.reacoes[e] ?? 0;
            const minha = minhas.includes(e);
            return (
              <button
                key={e} type="button" aria-pressed={minha} aria-label={`${e} ${n}`} onClick={() => reagir(e)}
                className={`flex min-h-8 items-center gap-1 rounded-full border px-2.5 text-[0.85rem] transition-colors active:bg-white/20 focus-visible:outline-2 focus-visible:outline-nevoa [@media(pointer:coarse)]:min-h-11 [@media(pointer:coarse)]:px-3.5 ${minha ? 'border-nevoa/50 bg-white/12' : 'border-white/12'}`}
              >
                <span aria-hidden>{e}</span>{n > 0 && <span className="font-mono text-[0.72rem] tabular-nums">{n}</span>}
              </button>
            );
          })}

          {escolher ? (
            <span role="group" aria-label="Reagir" className="msft-entra flex items-center rounded-full border border-white/15 bg-[#10172a] p-0.5">
              {REACOES.map((e) => (
                <button key={e} type="button" aria-label={`Reagir com ${e}`} onClick={() => reagir(e)} className="grid h-11 w-11 place-items-center rounded-full text-[1.35rem] transition-transform active:scale-90 tela:h-8 tela:w-8 tela:text-[1.1rem] tela:hover:bg-white/10">{e}</button>
              ))}
            </span>
          ) : (
            <button
              type="button" aria-label="Reagir" aria-expanded={escolher} onClick={() => setEscolher(true)}
              className="grid h-8 min-w-8 place-items-center rounded-full border border-dashed border-white/20 px-2 text-[0.95rem] text-nevoa/55 transition-colors active:bg-white/15 focus-visible:outline-2 focus-visible:outline-nevoa tela:hover:text-nevoa [@media(pointer:coarse)]:h-11 [@media(pointer:coarse)]:min-w-11"
            >＋</button>
          )}

          <span className="px-1 font-mono text-[0.68rem] text-nevoa/40"><time dateTime={c.criado} suppressHydrationWarning>{agora ? ha(c.criado, agora) : ''}</time></span>
          {meu && (
            <button
              type="button" onClick={() => (confirmar ? aoApagar() : setConfirmar(true))}
              className={`min-h-8 rounded-full px-2.5 font-mono text-[0.72rem] transition-colors [@media(pointer:coarse)]:min-h-11 ${confirmar ? 'bg-[#fb7185] text-noite' : 'text-nevoa/45 active:text-[#fb7185] tela:hover:text-[#fb7185]'}`}
            >{confirmar ? 'apagar mesmo?' : 'apagar'}</button>
          )}
        </div>
      </div>
    </li>
  );
}
