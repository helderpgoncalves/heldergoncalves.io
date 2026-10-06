'use client';

import { useState, type FormEvent } from 'react';
import type { Copy, Lang } from '@/lib/copy';

type Estado = 'parado' | 'a-enviar' | 'ok' | 'invalido' | 'limite' | 'erro';

export function FormSubscrever({ lang, t }: { lang: Lang; t: Copy['form'] }) {
  const [estado, setEstado] = useState<Estado>('parado');

  async function enviar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (estado === 'a-enviar') return;
    const dados = new FormData(e.currentTarget);
    setEstado('a-enviar');
    try {
      const r = await fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: dados.get('email'), website: dados.get('website'), lang }),
      });
      setEstado(r.ok ? 'ok' : r.status === 400 ? 'invalido' : r.status === 429 ? 'limite' : 'erro');
    } catch {
      setEstado('erro');
    }
  }

  const mensagem = { ok: t.enviado, invalido: t.invalido, limite: t.limite, erro: t.erro }[estado as 'ok'];

  return (
    <form onSubmit={enviar} noValidate className="w-full max-w-[34rem]">
      <label htmlFor="email" className="mb-3 block font-mono text-[0.72rem] tracking-[0.16em] text-suave uppercase">{t.rotulo}</label>
      {/* Isco para robôs: invisível e fora do teclado. */}
      <div aria-hidden className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
        <input type="text" name="website" tabIndex={-1} autoComplete="off" />
      </div>
      <div className="flex flex-col gap-2.5 sm:flex-row">
        <input
          id="email"
          name="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          required
          maxLength={254}
          placeholder={t.placeholder}
          disabled={estado === 'ok'}
          aria-invalid={estado === 'invalido'}
          aria-describedby="form-estado"
          className="min-w-0 flex-1 rounded-xl border border-linha bg-transparent px-4 py-3.5 text-base text-tinta outline-none transition-colors placeholder:text-suave/70 hover:border-suave focus:border-tinta disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={estado === 'a-enviar' || estado === 'ok'}
          className="rounded-xl bg-tinta px-6 py-3.5 text-base font-medium text-fundo transition-[opacity,translate] hover:-translate-y-px focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-acento disabled:translate-y-0 disabled:opacity-50"
        >
          {estado === 'a-enviar' ? t.aEnviar : t.botao}
        </button>
      </div>
      <p id="form-estado" role="status" aria-live="polite" className={`mt-3 min-h-[1.5rem] text-[0.95rem] ${estado === 'ok' ? 'text-tinta' : 'text-acento'}`}>
        {mensagem ?? <span className="text-suave">{t.nota}</span>}
      </p>
    </form>
  );
}
