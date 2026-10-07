'use client';

import { useState } from 'react';
import Link from 'next/link';
import type { Copy } from '@/lib/copy';

type Estado = 'parado' | 'a-confirmar' | 'ok' | 'ok-comentar' | 'invalido' | 'erro';

// A página para onde o botão do e-mail leva. Confirmar é um POST (nunca um GET): só uma pessoa a carregar no botão subscreve.
export function Confirmar({ token, t, comentarios, destino, publicar, sugestao }: {
  token: string;
  t: Copy['confirmar'];
  comentarios: Copy['comentarios']['sessaoOk'];
  destino: string;
  publicar?: { pre: Copy['comentarios']['confirmarPublicar']; ok: Copy['comentarios']['publicadoOk'] };
  sugestao?: { rotulo: string; titulo: string; href: string };
}) {
  const [estado, setEstado] = useState<Estado>(token ? 'parado' : 'invalido');
  const [volta, setVolta] = useState(destino);

  async function confirmar() {
    setEstado('a-confirmar');
    try {
      const r = await fetch('/api/confirm', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ t: token }) });
      const d = r.ok ? ((await r.json().catch(() => ({}))) as { comentar?: boolean; slug?: string; id?: string }) : {};
      if (d.slug) setVolta(`${destino}/${d.slug}#c-${d.id}`);
      setEstado(r.ok ? (d.comentar ? 'ok-comentar' : 'ok') : r.status === 400 ? 'invalido' : 'erro');
    } catch {
      setEstado('erro');
    }
  }

  const antes = estado === 'parado' || estado === 'a-confirmar';
  const feito = estado === 'ok' || estado === 'ok-comentar';
  const [titulo, texto] = antes ? (publicar ? [publicar.pre.titulo, publicar.pre.texto] : [t.titulo, t.texto]) : estado === 'ok' && publicar ? publicar.ok : estado === 'ok-comentar' ? comentarios : t[estado];

  return (
    <div role="status" aria-live="polite" className="relative">
      {feito ? (
        <svg viewBox="0 0 48 48" aria-hidden className="mb-6 size-14 text-acento" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="24" cy="24" r="21" className="confirmar-circulo" />
          <path d="M14.5 25.5 21 32l12.5-14" className="confirmar-visto" />
        </svg>
      ) : antes ? (
        <p className="mb-5 font-mono text-[0.72rem] tracking-[0.16em] text-suave uppercase">{t.etiqueta}</p>
      ) : null}
      <h1 className="font-serif text-[clamp(2.4rem,7vw,4rem)] leading-[1.02] tracking-[-0.02em] text-balance">{titulo}</h1>
      <p className="mt-5 max-w-[34rem] font-leitura text-[1.25rem] leading-relaxed text-suave text-pretty">{texto}</p>

      <div className="mt-9">
        {antes ? (
          <button
            onClick={confirmar}
            disabled={estado === 'a-confirmar'}
            className="group inline-flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl bg-tinta px-8 py-4 text-base font-medium text-fundo transition-[opacity,translate,box-shadow] duration-200 hover:-translate-y-px hover:shadow-[0_10px_30px_-12px_color-mix(in_srgb,var(--p-tinta)_55%,transparent)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-acento active:translate-y-0 disabled:opacity-60 sm:w-auto"
          >
            {estado === 'a-confirmar' ? t.aConfirmar : publicar ? publicar.pre.botao : t.botao}
            {estado !== 'a-confirmar' && <span aria-hidden className="transition-transform duration-200 group-hover:translate-x-0.5">→</span>}
          </button>
        ) : (
          <Link href={volta} className="inline-flex min-h-12 items-center text-base underline decoration-tinta/30 underline-offset-[6px] transition-colors hover:decoration-tinta">{t.voltar} →</Link>
        )}
      </div>

      {feito && sugestao && (
        <Link href={sugestao.href} className="mt-12 block max-w-[34rem] rounded-2xl border border-linha p-5 transition-colors hover:border-suave sm:p-6">
          <span className="block font-mono text-[0.72rem] tracking-[0.14em] text-suave uppercase">{sugestao.rotulo}</span>
          <span className="mt-2 block font-serif text-[1.7rem] leading-tight text-balance">{sugestao.titulo}</span>
        </Link>
      )}
    </div>
  );
}
