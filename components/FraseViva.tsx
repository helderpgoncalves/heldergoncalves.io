'use client';

import { useEffect, useRef } from 'react';

// A frase do topo: cada linha sobe de uma máscara, uma a seguir à outra, e passados uns segundos
// a frase desfaz-se e dá lugar à seguinte. Só CSS anima (transform e opacidade, no compositor); o JavaScript
// só troca o texto, por isso é leve em qualquer telemóvel.
//
// O HTML do servidor já traz a primeira frase, visível e animada só por CSS: sem JavaScript,
// ou com `prefers-reduced-motion`, fica parada e legível. O <h1> da página é estável e vive fora daqui.

const PAUSA = 6200; // quanto tempo cada frase fica inteira
const SAIDA = 520;  // duração da saída

type Frase = { linhas: readonly string[]; autor?: string };

export function FraseViva({ frases }: { frases: readonly Frase[] }) {
  const N = Math.max(...frases.map((f) => f.linhas.length));
  const raiz = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = raiz.current!;
    if (frases.length < 2 || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const linhas = [...el.querySelectorAll<HTMLElement>('[data-t]')];
    const autor = el.querySelector<HTMLElement>('[data-autor]')!;
    let i = 0, tempo = 0;

    const escrever = (f: Frase) => {
      linhas.forEach((l, k) => { l.textContent = f.linhas[k] ?? ''; });
      autor.textContent = f.autor ?? '';
    };
    const seguinte = () => {
      if (document.hidden) { tempo = window.setTimeout(seguinte, 600); return; }
      el.dataset.f = 'sai';
      tempo = window.setTimeout(() => {
        i = (i + 1) % frases.length;
        escrever(frases[i]);
        delete el.dataset.f;
        void el.offsetWidth; // reinicia as animações de entrada
        el.dataset.f = 'entra';
        tempo = window.setTimeout(seguinte, PAUSA);
      }, SAIDA);
    };

    tempo = window.setTimeout(seguinte, PAUSA);
    return () => clearTimeout(tempo);
  }, [frases]);

  const f = frases[0];
  return (
    <div ref={raiz} aria-hidden className="viva">
      {Array.from({ length: N }, (_, k) => (
        <span key={k} className="linha" style={{ '--k': k } as React.CSSProperties}><span data-t>{f.linhas[k] ?? ''}</span></span>
      ))}
      <span data-autor style={{ '--k': N } as React.CSSProperties}>{f.autor ?? ''}</span>
    </div>
  );
}
