'use client';

import { useState, type FormEvent } from 'react';
import type { Contacto } from '@/lib/bio';

type Fase = 'fechado' | 'a-carregar' | 'pronto' | 'a-enviar' | 'ok' | 'invalido' | 'desafio' | 'limite' | 'erro';
type Desafio = { pergunta: string; token: string };

const MENSAGENS: Partial<Record<Fase, string>> = {
  invalido: 'Escreve um e-mail válido.',
  desafio: 'A resposta não bate certo. Tenta outra vez.',
  limite: 'Demasiadas tentativas. Volta daqui a uns minutos.',
  erro: 'Não consegui abrir agora. Tenta mais tarde ou escreve-me por e-mail.',
};

const botao = 'grid size-[3.25rem] place-items-center rounded-full border border-nevoa/25 bg-noite/60 transition-[transform,background-color,border-color,color] duration-200 ease-out hover:border-[#f4b36a] hover:bg-[#f4b36a] hover:text-noite active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 motion-safe:hover:-translate-y-0.5 sm:backdrop-blur-md';

export function ContactosBio({ contactos, icones }: { contactos: readonly Contacto[]; icones: Record<Contacto['id'], string> }) {
  const [fase, setFase] = useState<Fase>('fechado');
  const [desafio, setDesafio] = useState<Desafio | null>(null);
  const [whatsapp, setWhatsapp] = useState<string | null>(null);

  async function abrir() {
    if (fase !== 'fechado' && fase !== 'erro') return setFase('fechado');
    setFase('a-carregar');
    try {
      const r = await fetch('/api/contacto/desafio', { cache: 'no-store' });
      if (!r.ok) return setFase(r.status === 429 ? 'limite' : 'erro');
      setDesafio((await r.json()) as Desafio);
      setFase('pronto');
    } catch {
      setFase('erro');
    }
  }

  async function enviar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (fase === 'a-enviar' || !desafio) return;
    const d = new FormData(e.currentTarget);
    setFase('a-enviar');
    try {
      const r = await fetch('/api/contacto', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: d.get('email'), resposta: d.get('resposta'), website: d.get('website'), token: desafio.token }),
      });
      if (r.ok) {
        setWhatsapp(((await r.json()) as { whatsapp: string }).whatsapp);
        return setFase('ok');
      }
      if (r.status === 400) {
        const { erro } = (await r.json().catch(() => ({}))) as { erro?: string };
        if (erro === 'desafio') { // o desafio gasta-se: pede um novo
          const n = await fetch('/api/contacto/desafio', { cache: 'no-store' }).then((x) => x.json() as Promise<Desafio>).catch(() => null);
          if (n) setDesafio(n);
          return setFase('desafio');
        }
        return setFase('invalido');
      }
      setFase(r.status === 429 ? 'limite' : 'erro');
    } catch {
      setFase('erro');
    }
  }

  const aberto = fase !== 'fechado';
  const mensagem = MENSAGENS[fase];

  return (
    <>
      <ul aria-label="Contactos" style={{ ['--i' as string]: 4 }} className="bio-entra mt-7 flex w-full justify-center gap-3">
        {contactos.map((k) => (
          <li key={k.id}>
            {k.url ? (
              <a href={k.url} aria-label={k.rotulo} title={k.rotulo} {...(k.url.startsWith('http') ? { target: '_blank', rel: 'me noopener' } : {})} className={botao}>
                <svg viewBox="0 0 24 24" aria-hidden className="size-6 fill-current"><path d={icones[k.id]} /></svg>
              </a>
            ) : (
              <button type="button" onClick={abrir} aria-label={k.rotulo} title={k.rotulo} aria-expanded={aberto} aria-controls="painel-whatsapp" className={`${botao} ${aberto ? 'border-[#f4b36a] bg-[#f4b36a] text-noite' : ''}`}>
                <svg viewBox="0 0 24 24" aria-hidden className="size-6 fill-current"><path d={icones[k.id]} /></svg>
              </button>
            )}
          </li>
        ))}
      </ul>

      {aberto && (
        <div id="painel-whatsapp" className="mt-4 w-full rounded-2xl border border-nevoa/25 bg-noite/80 p-5 text-left sm:backdrop-blur-md">
          {fase === 'ok' && whatsapp ? (
            <>
              <p className="text-[1.02rem] font-medium">Pronto. Podes falar comigo.</p>
              <a href={whatsapp} target="_blank" rel="noopener" className="mt-3 block rounded-xl bg-[#f4b36a] px-5 py-3.5 text-center font-medium text-noite hover:bg-[#f8c48b]">Abrir o WhatsApp</a>
            </>
          ) : fase === 'a-carregar' ? (
            <p className="text-[0.9rem] text-nevoa/80">A preparar…</p>
          ) : desafio && fase !== 'erro' ? (
            <form onSubmit={enviar} noValidate>
              <p className="text-[0.95rem] text-nevoa/85">Para ver o número, diz-me o teu e-mail e resolve isto. Não guardo o e-mail.</p>
              <div aria-hidden className="absolute -left-[9999px] h-0 w-0 overflow-hidden"><input type="text" name="website" tabIndex={-1} autoComplete="off" /></div>
              <label htmlFor="bio-email" className="mt-4 block font-mono text-[0.7rem] tracking-[0.14em] text-nevoa/70 uppercase">O teu e-mail</label>
              <input id="bio-email" name="email" type="email" inputMode="email" autoComplete="email" required maxLength={254} className="mt-1.5 w-full rounded-xl border border-nevoa/25 bg-transparent px-4 py-3 text-base outline-none focus:border-nevoa" />
              <label htmlFor="bio-resposta" className="mt-4 block text-[0.95rem]">{desafio.pergunta}</label>
              <input id="bio-resposta" name="resposta" type="text" inputMode="numeric" autoComplete="off" required maxLength={3} className="mt-1.5 w-full rounded-xl border border-nevoa/25 bg-transparent px-4 py-3 text-base outline-none focus:border-nevoa" />
              <button type="submit" disabled={fase === 'a-enviar'} className="mt-4 w-full rounded-xl bg-[#f4b36a] px-5 py-3.5 font-medium text-noite hover:bg-[#f8c48b] disabled:opacity-60">{fase === 'a-enviar' ? 'A verificar…' : 'Ver o número'}</button>
              <p role="status" aria-live="polite" className="mt-3 min-h-5 text-[0.88rem] text-[#f4b36a]">{mensagem}</p>
            </form>
          ) : (
            <p role="status" className="text-[0.95rem] text-[#f4b36a]">{mensagem ?? MENSAGENS.erro}</p>
          )}
        </div>
      )}
    </>
  );
}
