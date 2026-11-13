'use client';

import { useEffect, useState } from 'react';

type Props = { url: string; titulo: string; rotulo: string; copiar: string; copiado: string; em: string; porEmail: string };

// Partilha sem scripts de terceiros nem rastreio: ligações simples para as redes de sempre,
// copiar a ligação e, onde existe, a folha de partilha do telemóvel.
const ICONES = {
  linkedin: 'M4.98 3.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5zM3 9.75h4V21H3zM9.5 9.75h3.8v1.54h.05c.53-1 1.82-2.04 3.75-2.04 4 0 4.75 2.63 4.75 6.05V21h-4v-5.07c0-1.2-.02-2.76-1.7-2.76-1.7 0-1.96 1.3-1.96 2.67V21h-4z',
  whatsapp: 'M12.04 2a9.9 9.9 0 0 0-8.5 14.9L2 22l5.25-1.38A9.9 9.9 0 1 0 12.04 2zm0 1.8a8.1 8.1 0 1 1-4.13 15.07l-.3-.18-3.1.82.83-3.02-.2-.31A8.1 8.1 0 0 1 12.04 3.8zM8.6 7.5c-.2 0-.5.07-.76.35-.26.28-1 .97-1 2.37s1.02 2.75 1.16 2.94c.14.19 1.98 3.1 4.9 4.23 2.43.96 2.92.77 3.45.72.53-.05 1.7-.7 1.94-1.37.24-.67.24-1.25.17-1.37-.07-.12-.26-.19-.55-.33-.28-.15-1.7-.84-1.96-.93-.26-.1-.45-.14-.64.14-.19.29-.74.93-.9 1.12-.17.19-.33.21-.62.07-.28-.14-1.2-.44-2.28-1.4-.84-.75-1.4-1.68-1.57-1.96-.16-.29-.02-.44.12-.58.13-.13.29-.33.43-.5.14-.16.19-.28.28-.47.1-.19.05-.36-.02-.5-.07-.14-.64-1.56-.88-2.13-.23-.55-.47-.48-.64-.49z',
  x: 'M17.75 3h3.07l-6.7 7.66L22 21h-6.17l-4.83-6.32L5.47 21H2.4l7.17-8.2L2 3h6.33l4.37 5.78zm-1.08 16.17h1.7L7.4 4.74H5.58z',
  facebook: 'M13.5 21v-8.2h2.76l.41-3.2H13.5V7.56c0-.93.26-1.56 1.59-1.56h1.7V3.14A22.6 22.6 0 0 0 14.3 3C11.85 3 10.18 4.5 10.18 7.23V9.6H7.4v3.2h2.78V21z',
  email: 'M3 5h18a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1zm1.4 2 7.6 5.6L19.6 7zM4 8.6V17h16V8.6l-8 5.9z',
  ligacao: 'M10.6 13.4a1 1 0 0 1 0-1.4l3-3a3 3 0 1 1 4.24 4.24l-1.5 1.5-1.42-1.42 1.5-1.5a1 1 0 0 0-1.4-1.4l-3 3a1 1 0 0 1-1.42 0zm2.8-2.8a1 1 0 0 1 0 1.4l-3 3a3 3 0 1 1-4.24-4.24l1.5-1.5 1.42 1.42-1.5 1.5a1 1 0 1 0 1.4 1.4l3-3a1 1 0 0 1 1.42 0z',
  certo: 'M9.55 17.6 4.7 12.75l1.4-1.4 3.45 3.45 8.35-8.35 1.4 1.4z',
  partilhar: 'M18 16.1c-.76 0-1.44.3-1.96.77L8.9 12.7a3.3 3.3 0 0 0 0-1.4l7.05-4.12A3 3 0 1 0 15 5a3 3 0 0 0 .09.7L8.04 9.81a3 3 0 1 0 0 4.38l7.12 4.17c-.05.2-.08.41-.08.64a2.92 2.92 0 1 0 2.92-2.9z',
} as const;

export function Partilhar({ url, titulo, rotulo, copiar, copiado, em, porEmail }: Props) {
  const [nativo, setNativo] = useState(false);
  const [feito, setFeito] = useState(false);
  useEffect(() => setNativo(typeof navigator.share === 'function'), []);
  useEffect(() => {
    if (!feito) return;
    const t = setTimeout(() => setFeito(false), 2000);
    return () => clearTimeout(t);
  }, [feito]);

  const u = encodeURIComponent(url);
  const t = encodeURIComponent(titulo);
  const redes = [
    { id: 'linkedin', nome: 'LinkedIn', href: `https://www.linkedin.com/sharing/share-offsite/?url=${u}` },
    { id: 'whatsapp', nome: 'WhatsApp', href: `https://wa.me/?text=${t}%20${u}` },
    { id: 'x', nome: 'X', href: `https://twitter.com/intent/tweet?text=${t}&url=${u}` },
    { id: 'facebook', nome: 'Facebook', href: `https://www.facebook.com/sharer/sharer.php?u=${u}` },
  ] as const;

  const botao = 'grid size-11 place-items-center rounded-full border border-linha text-suave transition-[color,border-color,background-color,transform] duration-200 hover:border-tinta hover:bg-tinta hover:text-fundo active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2';
  const Icone = ({ d }: { d: string }) => <svg viewBox="0 0 24 24" aria-hidden className="size-[1.15rem] fill-current"><path d={d} /></svg>;

  return (
    <div role="group" aria-label={rotulo} className="flex flex-wrap items-center gap-2.5">
      {nativo && (
        <button type="button" title={rotulo} aria-label={rotulo} className={botao} onClick={() => navigator.share({ title: titulo, url }).catch(() => {})}>
          <Icone d={ICONES.partilhar} />
        </button>
      )}
      {redes.map((r) => (
        <a key={r.id} href={r.href} target="_blank" rel="noopener noreferrer" title={`${em} ${r.nome}`} aria-label={`${em} ${r.nome}`} className={botao}>
          <Icone d={ICONES[r.id]} />
        </a>
      ))}
      <a href={`mailto:?subject=${t}&body=${u}`} title={porEmail} aria-label={porEmail} className={botao}>
        <Icone d={ICONES.email} />
      </a>
      <button
        type="button"
        title={feito ? copiado : copiar}
        aria-label={copiar}
        className={`${botao} ${feito ? 'border-tinta bg-tinta text-fundo' : ''}`}
        onClick={async () => {
          try { await navigator.clipboard.writeText(url); setFeito(true); } catch { /* sem permissão: nada a fazer */ }
        }}
      >
        <Icone d={feito ? ICONES.certo : ICONES.ligacao} />
      </button>
      <span role="status" aria-live="polite" className="font-mono text-[0.74rem] text-suave">{feito ? copiado : ''}</span>
    </div>
  );
}
