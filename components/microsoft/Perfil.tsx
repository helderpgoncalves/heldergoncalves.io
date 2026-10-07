'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import { AVATARES, CORES, corCss } from '@/lib/microsoft/chat';
import { toque } from './toque';

type Perfil = { nome: string; avatar: string; cor: number };
type Props = { inicial: Perfil; botao: string; aoGuardar: (nome: string, avatar: string, cor: number) => void; aoCancelar?: () => void };

const NOME_VALIDO = /^[\p{L}\p{N} ._'-]{2,24}$/u;
const comToque = () => typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches;

/** O formulário do perfil: nickname, avatar e cor. Serve para entrar (a primeira vez) e para editar. */
export function Perfil({ inicial, botao, aoGuardar, aoCancelar }: Props) {
  const [nome, setNome] = useState(inicial.nome);
  const [avatar, setAvatar] = useState(inicial.avatar);
  const [cor, setCor] = useState(inicial.cor);
  const [erro, setErro] = useState('');
  const campo = useRef<HTMLInputElement>(null);

  // No telemóvel não abrimos o teclado sozinhos: tapava logo o avatar e as cores.
  useEffect(() => { if (!comToque()) campo.current?.focus({ preventScroll: true }); }, []);

  function guardar(e: FormEvent) {
    e.preventDefault();
    const limpo = nome.normalize('NFC').replace(/\s+/g, ' ').trim();
    if (!NOME_VALIDO.test(limpo)) { setErro('Usa 2 a 24 letras, números ou . _ - \''); campo.current?.focus(); return; }
    toque();
    aoGuardar(limpo, avatar, cor);
  }

  return (
    <form onSubmit={guardar} className="space-y-4">
      <div className="flex items-center gap-3">
        <span aria-hidden className="grid h-14 w-14 shrink-0 place-items-center rounded-full text-[1.9rem] transition-colors" style={{ background: corCss(cor) }}>{avatar}</span>
        <div className="min-w-0 flex-1">
          <label htmlFor="perfil-nick" className="mb-1 block font-mono text-[0.66rem] tracking-[0.14em] text-nevoa/50 uppercase">Nickname</label>
          <input
            id="perfil-nick" ref={campo} value={nome} onChange={(e) => { setNome(e.target.value); setErro(''); }} maxLength={24} autoComplete="nickname" autoCapitalize="words" enterKeyHint="done" placeholder="nome de macaco"
            aria-invalid={Boolean(erro)} aria-describedby="perfil-erro"
            className="min-h-12 w-full rounded-xl border border-white/12 bg-transparent px-3 text-base outline-none transition-colors placeholder:text-nevoa/30 focus:border-nevoa/60"
          />
        </div>
      </div>
      <p id="perfil-erro" role="alert" className="-mt-2 text-[0.82rem] text-[#fb7185] empty:hidden">{erro}</p>

      {/* Alvos de pelo menos 44 px no telemóvel: 6 por linha, em vez de 8. */}
      <div role="group" aria-label="Avatar" className="grid grid-cols-6 gap-1.5 tela:grid-cols-8 tela:gap-1">
        {AVATARES.map((a) => (
          <button
            key={a} type="button" aria-pressed={a === avatar} aria-label={`Avatar ${a}`} onClick={() => { setAvatar(a); toque(); }}
            className={`grid aspect-square w-full place-items-center rounded-xl text-[1.55rem] transition-colors active:bg-white/20 tela:rounded-lg tela:text-[1.25rem] tela:hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-nevoa ${a === avatar ? 'bg-white/15 ring-1 ring-nevoa/60' : ''}`}
          >{a}</button>
        ))}
      </div>

      <div role="group" aria-label="Cor" className="grid grid-cols-4 gap-2 tela:grid-cols-8 tela:gap-1.5">
        {CORES.map((_, i) => (
          <button
            key={i} type="button" aria-pressed={i === cor} aria-label={`Cor ${i + 1}`} onClick={() => { setCor(i); toque(); }}
            className={`h-11 rounded-xl transition-transform active:scale-95 tela:h-7 tela:rounded-full tela:hover:scale-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nevoa ${i === cor ? 'ring-2 ring-nevoa ring-offset-2 ring-offset-[#0d1220]' : ''}`}
            style={{ background: corCss(i) }}
          />
        ))}
      </div>

      {/* Os botões ficam sempre à vista, mesmo com a folha a rolar. */}
      <div className="sticky bottom-0 -mx-1 flex gap-2 bg-[#0d1220] px-1 pt-2 pb-1">
        {aoCancelar && <button type="button" onClick={aoCancelar} className="min-h-12 rounded-xl border border-white/15 px-5 text-base transition-colors active:bg-white/10 tela:hover:bg-white/8">Cancelar</button>}
        <button type="submit" className="min-h-12 flex-1 rounded-xl bg-nevoa px-4 text-base font-medium text-noite transition-[translate] active:translate-y-px tela:hover:-translate-y-px focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nevoa">{botao}</button>
      </div>
    </form>
  );
}

/**
 * O perfil por cima do compositor. No telemóvel é uma folha que sobe do fundo (com fundo escurecido e
 * à altura do teclado); no desktop, um balão ao lado do avatar. Fecha com Esc ou ao tocar fora.
 */
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
    <div className="fixed inset-x-0 top-0 z-40 flex h-[var(--app-h,100dvh)] items-end tela:contents">
      <div aria-hidden className="msft-fundo absolute inset-0 bg-black/65 tela:hidden" />
      <div
        ref={ref} role="dialog" aria-label="O teu perfil"
        className="msft-folha relative max-h-[90%] w-full overflow-y-auto overscroll-contain rounded-t-3xl border-t border-white/12 bg-[#0d1220] px-5 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-[0_-24px_60px_-12px_#000] tela:absolute tela:bottom-full tela:left-0 tela:z-20 tela:mb-3 tela:max-h-none tela:w-[22rem] tela:overflow-visible tela:rounded-2xl tela:border tela:p-4 tela:shadow-[0_24px_60px_-12px_#000]"
      >
        <span aria-hidden className="mx-auto mb-3 block h-1 w-10 rounded-full bg-white/25 tela:hidden" />
        <Perfil {...resto} aoCancelar={aoFechar} />
      </div>
    </div>
  );
}
