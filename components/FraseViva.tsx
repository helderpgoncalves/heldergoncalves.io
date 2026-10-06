'use client';

import { useEffect, useRef } from 'react';

// A frase do topo: descodifica-se letra a letra (cada uma atravessa glifos de máquina
// antes de assentar) e, passados uns segundos, transforma-se na seguinte. Só mudam as
// letras que diferem; as que coincidem ficam quietas. Cada célula tem a largura exacta
// da letra final, por isso o texto nunca treme.
//
// O HTML do servidor já traz a primeira frase (e o <h1> um texto só para leitores de ecrã),
// por isso sem JavaScript, ou com `prefers-reduced-motion`, fica a frase parada e legível.

const GLIFOS = '01<>/\\|_-+*#=%$&?[]{}~^';
const PAUSA = 5200; // quanto tempo cada frase fica inteira

type Frase = readonly [string, string];
type Tarefa = { cel: HTMLElement; para: string; ini: number; fim: number; ult: number; feito: boolean };

export function FraseViva({ frases }: { frases: readonly Frase[] }) {
  const raiz = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const el = raiz.current!;
    const reduzido = matchMedia('(prefers-reduced-motion: reduce)').matches;
    el.style.opacity = '1'; el.style.animation = 'none';
    if (reduzido || frases.length < 2) return;

    const linhas = [...el.querySelectorAll<HTMLElement>('[data-linha]')];
    const celulas: HTMLElement[][] = linhas.map(() => []);
    const atual: string[] = linhas.map(() => '');
    const medidas = new Map<string, number>();
    const ctx = document.createElement('canvas').getContext('2d')!;

    const largura = (l: number, ch: string) => {
      if (ch === '') return 0;
      const k = `${l}|${ch}`;
      let w = medidas.get(k);
      if (w === undefined) {
        const cs = getComputedStyle(linhas[l]);
        ctx.font = `${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
        w = ctx.measureText(ch).width;
        medidas.set(k, w);
      }
      return w;
    };

    let tarefas: Tarefa[] = [];
    let raf = 0, espera = 0, indice = 0, vivo = true;

    const lampejo = (t: Tarefa) => {
      t.cel.removeAttribute('data-s');
      t.cel.textContent = t.para;
      t.cel.classList.add('trava');
      t.cel.addEventListener('animationend', () => t.cel.classList.remove('trava'), { once: true });
      t.feito = true;
    };

    const passo = (agora: number) => {
      if (!vivo) return;
      let restam = false;
      for (const t of tarefas) {
        if (t.feito) continue;
        restam = true;
        if (agora < t.ini) continue;
        if (agora >= t.fim) { lampejo(t); continue; }
        if (agora - t.ult > 55) {
          t.cel.dataset.s = '1';
          t.cel.textContent = GLIFOS[(Math.random() * GLIFOS.length) | 0];
          t.ult = agora;
        }
      }
      if (restam) raf = requestAnimationFrame(passo);
      else terminar();
    };

    const terminar = () => {
      // Limpa as células que sobraram quando a frase nova é mais curta.
      celulas.forEach((cs, l) => {
        while (cs.length > atual[l].length) cs.pop()!.remove();
      });
      espera = window.setTimeout(() => { indice = (indice + 1) % frases.length; transformar(frases[indice]); }, PAUSA);
    };

    const transformar = (frase: Frase) => {
      if (document.hidden) { espera = window.setTimeout(() => transformar(frase), 800); return; }
      const agora = performance.now();
      tarefas = [];
      frase.forEach((alvo, l) => {
        const antes = atual[l];
        const n = Math.max(antes.length, alvo.length);
        for (let i = 0; i < n; i++) {
          let cel = celulas[l][i];
          if (!cel) {
            cel = document.createElement('span');
            cel.className = 'c';
            cel.style.width = '0px';
            linhas[l].append(cel);
            celulas[l][i] = cel;
          }
          const de = antes[i] ?? '', para = alvo[i] ?? '';
          cel.style.width = `${largura(l, para)}px`;
          if (de === para) continue; // igual: fica quieta
          const ini = agora + i * 30 + l * 170 + Math.random() * 50;
          tarefas.push({ cel, para, ini, fim: ini + 340 + Math.random() * 280, ult: 0, feito: false });
        }
        atual[l] = alvo;
      });
      raf = requestAnimationFrame(passo);
    };

    let redim = 0;
    const medirTudo = () => {
      medidas.clear();
      celulas.forEach((cs, l) => cs.forEach((c, i) => { c.style.width = `${largura(l, atual[l][i] ?? '')}px`; }));
    };
    const aoRedimensionar = () => { clearTimeout(redim); redim = window.setTimeout(medirTudo, 120); };
    addEventListener('resize', aoRedimensionar);

    // Começa quando as fontes estão prontas, para medir letras verdadeiras.
    linhas.forEach((l) => (l.textContent = ''));
    document.fonts.ready.then(() => { if (vivo) transformar(frases[0]); });

    return () => {
      vivo = false; cancelAnimationFrame(raf); clearTimeout(espera); clearTimeout(redim);
      removeEventListener('resize', aoRedimensionar);
    };
  }, [frases]);

  const [a, b] = frases[0];
  return (
    <>
      <span className="sr-only">{a} {b}</span>
      <span ref={raiz} aria-hidden className="viva">
        <span data-linha>{a}</span>
        <em data-linha className="text-nevoa/80">{b}</em>
      </span>
      <noscript><style>{'.viva{opacity:1!important;animation:none!important}'}</style></noscript>
    </>
  );
}
