'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import { AVATARES, CORES, corCss } from '@/lib/microsoft/chat';

type Perfil = { nome: string; avatar: string; cor: number };
type Props = { inicial: Perfil; botao: string; aoGuardar: (nome: string, avatar: string, cor: number) => void; aoCancelar?: () => void };

const NOME_VALIDO = /^[\p{L}\p{N} ._'-]{2,24}$/u;

/** O formulário do perfil: nickname, avatar e cor. Serve para entrar (a primeira vez) e para editar. */
export function Perfil({ inicial, botao, aoGuardar, aoCancelar }: Props) {
  const [nome, setNome] = useState(inicial.nome);
  const [avatar, setAvatar] = useState(inicial.avatar);
  const [cor, setCor] = useState(inicial.cor);
  const [erro, setErro] = useState('');
  const campo = useRef<HTMLInputElement>(null);

  useEffect(() => { campo.current?.focus({ preventScroll: true }); }, []);

  function guardar(e: FormEvent) {
    e.preventDefault();
    const limpo = nome.normalize('NFC').replace(/\s+/g, ' ').trim();
    if (!NOME_VALIDO.test(limpo)) return setErro('Usa 2 a 24 letras, números ou . _ - \'');
    aoGuardar(limpo, avatar, cor);
  }

  return (
    <form onSubmit={guardar} className="space-y-4">
      <div className="flex items-center gap-3">
        <span aria-hidden className="grid h-14 w-14 shrink-0 place-items-center rounded-full text-[1.9rem] transition-colors" style={{ background: corCss(cor) }}>{avatar}</span>
        <div className="min-w-0 flex-1">
          <label htmlFor="perfil-nick" className="mb-1 block font-mono text-[0.66rem] tracking-[0.14em] text-nevoa/50 uppercase">Nickname</label>
          <input
            id="perfil-nick" ref={campo} value={nome} onChange={(e) => { setNome(e.target.value); setErro(''); }} maxLength={24} autoComplete="nickname" placeholder="nome de macaco"
            aria-invalid={Boolean(erro)} aria-describedby="perfil-erro"
            className="w-full rounded-xl border border-white/12 bg-transparent px-3 py-2.5 text-base outline-none transition-colors placeholder:text-nevoa/30 focus:border-nevoa/60"
          />
        </div>
      </div>
      <p id="perfil-erro" role="alert" className="-mt-2 min-h-[1.1rem] text-[0.82rem] text-[#fb7185]">{erro}</p>

      <div role="group" aria-label="Avatar" className="grid grid-cols-8 gap-1 [@media(pointer:coarse)]:gap-1.5">
        {AVATARES.map((a) => (
          <button
            key={a} type="button" aria-pressed={a === avatar} aria-label={`Avatar ${a}`} onClick={() => setAvatar(a)}
            className={`grid aspect-square w-full place-items-center rounded-lg text-[1.25rem] transition-colors hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-nevoa [@media(pointer:coarse)]:text-[1.4rem] ${a === avatar ? 'bg-white/15 ring-1 ring-nevoa/60' : ''}`}
          >{a}</button>
        ))}
      </div>

      <div role="group" aria-label="Cor" className="flex items-center justify-between px-1">
        {CORES.map((_, i) => (
          <button
            key={i} type="button" aria-pressed={i === cor} aria-label={`Cor ${i + 1}`} onClick={() => setCor(i)}
            className={`h-7 w-7 rounded-full transition-transform hover:scale-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nevoa ${i === cor ? 'ring-2 ring-nevoa ring-offset-2 ring-offset-[#0d1220]' : ''}`}
            style={{ background: corCss(i) }}
          />
        ))}
      </div>

      <div className="flex gap-2">
        {aoCancelar && <button type="button" onClick={aoCancelar} className="rounded-xl border border-white/15 px-4 py-2.5 text-base transition-colors hover:bg-white/8">Cancelar</button>}
        <button type="submit" className="flex-1 rounded-xl bg-nevoa px-4 py-2.5 text-base font-medium text-noite transition-[translate] hover:-translate-y-px focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nevoa">{botao}</button>
      </div>
    </form>
  );
}

/** O perfil num balão por cima do botão que o abre. Fecha com Esc ou ao clicar fora. */
export function PerfilBalao({ aoFechar, ...resto }: Props & { aoFechar: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const fora = (e: PointerEvent) => { if (!ref.current?.contains(e.target as Node)) aoFechar(); };
    const tecla = (e: KeyboardEvent) => { if (e.key === 'Escape') aoFechar(); };
    const t = setTimeout(() => document.addEventListener('pointerdown', fora), 0); // o toque que abriu não o fecha
    document.addEventListener('keydown', tecla);
    return () => { clearTimeout(t); document.removeEventListener('pointerdown', fora); document.removeEventListener('keydown', tecla); };
  }, [aoFechar]);

  return (
    <div ref={ref} role="dialog" aria-label="O teu perfil" className="absolute bottom-full left-0 z-20 mb-3 w-[min(22rem,calc(100vw-2.5rem))] rounded-2xl border border-white/12 bg-[#0d1220] p-4 shadow-[0_24px_60px_-12px_#000]">
      <Perfil {...resto} aoCancelar={aoFechar} />
    </div>
  );
}
