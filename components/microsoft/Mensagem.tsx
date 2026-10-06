import { REACOES, corCss } from '@/lib/microsoft/chat';
import type { Comentario } from '@/lib/microsoft/tipos';
import { ha } from './formato';

type Props = {
  c: Comentario;
  agora: number | null;
  minhas: string[];
  meu: boolean;
  aoReagir: (emoji: string) => void;
  aoApagar: () => void;
};

// Um balão de chat: as tuas mensagens à direita, as dos outros à esquerda, com avatar.
export function Mensagem({ c, agora, minhas, meu, aoReagir, aoApagar }: Props) {
  const hora = <time dateTime={c.criado} suppressHydrationWarning>{agora ? ha(c.criado, agora) : ''}</time>;
  return (
    <li className={`msft-entra group flex items-end gap-2 ${meu ? 'flex-row-reverse' : ''}`}>
      <span aria-hidden className="mb-5 grid h-9 w-9 shrink-0 place-items-center rounded-full text-[1.2rem]" style={{ background: corCss(c.cor) }}>{c.avatar}</span>
      <div className={`flex min-w-0 max-w-[85%] flex-col ${meu ? 'items-end' : 'items-start'}`}>
        {!meu && <span className="mb-0.5 px-1 text-[0.82rem] font-medium text-nevoa/80">{c.nome}</span>}
        <p className={`rounded-2xl px-3.5 py-2 break-words whitespace-pre-wrap ${meu ? 'rounded-br-md bg-[#22406b] text-nevoa' : 'rounded-bl-md bg-white/[0.07] text-nevoa/90'}`}>{c.texto}</p>

        <div className={`mt-1 flex flex-wrap items-center gap-1.5 ${meu ? 'justify-end' : ''}`}>
          {REACOES.map((e) => {
            const n = c.reacoes[e] ?? 0;
            const minha = minhas.includes(e);
            return (
              <button
                key={e} type="button" aria-pressed={minha} aria-label={`${e} ${n}`} onClick={() => aoReagir(e)}
                className={`flex items-center gap-1 rounded-full border px-2 py-0.5 text-[0.78rem] transition-colors focus-visible:outline-2 focus-visible:outline-nevoa [@media(pointer:coarse)]:min-h-9 [@media(pointer:coarse)]:px-3 ${
                  minha ? 'border-nevoa/50 bg-white/12' : n ? 'border-white/12 hover:bg-white/8' : 'border-transparent opacity-0 group-hover:border-white/10 group-hover:opacity-60 focus-visible:opacity-100 [@media(hover:none)]:opacity-40'
                }`}
              >
                <span aria-hidden>{e}</span>{n > 0 && <span className="font-mono text-[0.7rem] tabular-nums">{n}</span>}
              </button>
            );
          })}
          <span className="px-1 font-mono text-[0.66rem] text-nevoa/35">{hora}</span>
          {meu && <button type="button" onClick={aoApagar} className="px-1 font-mono text-[0.66rem] text-nevoa/35 underline-offset-2 transition-colors hover:text-[#fb7185] hover:underline focus-visible:text-[#fb7185]">apagar</button>}
        </div>
      </div>
    </li>
  );
}
