import type { Metadata } from 'next';
import './globals.css';
import { fontes } from '@/lib/fontes';

// Há várias raízes (uma por língua e uma por mini-app), por isso o 404 geral vive aqui,
// com as duas línguas. Os 404 dentro de uma língua usam as respostas normais do Next.
export const metadata: Metadata = { title: '404', robots: { index: false, follow: false } };

export default function NaoEncontrada() {
  return (
    <html lang="pt-PT" className={fontes}>
      <body>
        <main className="papel grid place-items-center px-6">
          <div className="max-w-[36rem]">
            <p className="font-mono text-[0.75rem] tracking-[0.18em] text-suave uppercase">404</p>
            <h1 className="mt-5 font-serif text-[clamp(3rem,9vw,6rem)] leading-[0.95] tracking-[-0.03em]">Não encontrada.</h1>
            <p className="mt-4 font-serif text-[clamp(1.6rem,4vw,2.4rem)] leading-tight text-suave italic">Page not found.</p>
            <p className="mt-9 flex gap-7 font-mono text-[0.9rem]">
              <a href="/" className="underline decoration-linha underline-offset-[6px] hover:decoration-tinta">Início →</a>
              <a href="/en" className="underline decoration-linha underline-offset-[6px] hover:decoration-tinta">Home →</a>
            </p>
          </div>
        </main>
      </body>
    </html>
  );
}
