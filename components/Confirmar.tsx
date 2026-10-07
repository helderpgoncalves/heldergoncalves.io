'use client';

import { useState } from 'react';
import Link from 'next/link';
import type { Copy } from '@/lib/copy';

export function Confirmar({ token, t, comentarios, destino, publicar }: { token: string; t: Copy['confirmar']; comentarios: Copy['comentarios']['sessaoOk']; destino: string; publicar?: { pre: Copy['comentarios']['confirmarPublicar']; ok: Copy['comentarios']['publicadoOk'] } }) {
  const [estado, setEstado] = useState<'parado' | 'a-confirmar' | 'ok' | 'ok-comentar' | 'invalido' | 'erro'>(token ? 'parado' : 'invalido');
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

  const antes = publicar ? [publicar.pre.titulo, publicar.pre.texto] : [t.titulo, t.texto];
  const [titulo, texto] = estado === 'parado' || estado === 'a-confirmar' ? antes : estado === 'ok' && publicar ? publicar.ok : estado === 'ok-comentar' ? comentarios : t[estado];

  return (
    <div role="status" aria-live="polite">
      <h1 className="font-serif text-[clamp(2.4rem,6vw,4rem)] leading-[1.02] tracking-[-0.02em] text-balance">{titulo}</h1>
      <p className="mt-5 max-w-[34rem] font-leitura text-xl leading-relaxed text-suave">{texto}</p>
      <div className="mt-8">
        {estado === 'parado' || estado === 'a-confirmar' ? (
          <button
            onClick={confirmar}
            disabled={estado === 'a-confirmar'}
            className="rounded-xl bg-tinta px-6 py-3.5 text-base font-medium text-fundo transition-[opacity,translate] hover:-translate-y-px focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-acento disabled:opacity-50"
          >
            {estado === 'a-confirmar' ? t.aConfirmar : publicar ? publicar.pre.botao : t.botao}
          </button>
        ) : (
          <Link href={volta} className="text-base underline decoration-tinta/30 underline-offset-[6px] transition-colors hover:decoration-tinta">{t.voltar} →</Link>
        )}
      </div>
    </div>
  );
}
