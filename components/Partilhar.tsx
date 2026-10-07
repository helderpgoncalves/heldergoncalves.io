'use client';

import { useEffect, useState } from 'react';

type Props = { url: string; titulo: string; rotulo: string; copiar: string; copiado: string };

// Partilha sem redes sociais nem rastreio: a folha de partilha do telemóvel quando existe,
// e copiar a ligação em qualquer caso.
export function Partilhar({ url, titulo, rotulo, copiar, copiado }: Props) {
  const [nativo, setNativo] = useState(false);
  const [feito, setFeito] = useState(false);
  useEffect(() => setNativo(typeof navigator.share === 'function'), []);
  useEffect(() => {
    if (!feito) return;
    const t = setTimeout(() => setFeito(false), 2000);
    return () => clearTimeout(t);
  }, [feito]);

  const classe = 'rounded-full border border-linha px-4 py-2 transition-colors hover:border-suave hover:text-tinta';
  return (
    <div role="group" aria-label={rotulo} className="flex flex-wrap items-center gap-3 font-mono text-[0.78rem] text-suave">
      <button
        type="button"
        className={classe}
        onClick={async () => {
          try { await navigator.clipboard.writeText(url); setFeito(true); } catch { /* sem permissão: nada a fazer */ }
        }}
      >
        {feito ? `✓ ${copiado}` : copiar}
      </button>
      {nativo && (
        <button type="button" className={classe} onClick={() => navigator.share({ title: titulo, url }).catch(() => {})}>
          {rotulo}
        </button>
      )}
      <span role="status" aria-live="polite" className="sr-only">{feito ? copiado : ''}</span>
    </div>
  );
}
