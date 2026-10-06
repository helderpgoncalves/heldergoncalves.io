'use client';

import './globals.css';

// Último recurso: se até o layout rebentar, ainda assim aparece algo decente, nas duas línguas.
export default function ErroGlobal({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="pt-PT">
      <body>
        <main className="papel grid place-items-center px-6">
          <div className="max-w-[36rem]">
            <h1 className="font-serif text-[clamp(2.6rem,8vw,5rem)] leading-[0.98] tracking-[-0.03em]">Algo correu mal.</h1>
            <p className="mt-4 font-serif text-[clamp(1.4rem,3.6vw,2rem)] leading-tight text-suave italic">Something went wrong.</p>
            <button
              onClick={reset}
              className="mt-9 rounded-xl bg-tinta px-6 py-3.5 text-base font-medium text-fundo transition-[translate] hover:-translate-y-px focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-acento"
            >
              Tentar outra vez · Try again
            </button>
          </div>
        </main>
      </body>
    </html>
  );
}
