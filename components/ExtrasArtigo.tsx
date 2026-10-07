'use client';

import { useEffect } from 'react';

type Props = { copiar: string; copiado: string };

// Tudo o que é "extra" na leitura e só faz sentido com JavaScript: botão de copiar em cada bloco
// de código e o índice a assinalar a secção que se está a ler. Sem JavaScript, o texto é igual.
export function ExtrasArtigo({ copiar, copiado }: Props) {
  useEffect(() => {
    const limpezas: (() => void)[] = [];

    // Copiar código
    document.querySelectorAll<HTMLElement>('.leitura .codigo').forEach((bloco) => {
      const botao = document.createElement('button');
      botao.type = 'button';
      botao.className = 'copiar';
      botao.textContent = copiar;
      let t: ReturnType<typeof setTimeout>;
      botao.onclick = async () => {
        try {
          await navigator.clipboard.writeText(bloco.querySelector('code')?.textContent ?? '');
          botao.textContent = copiado;
          botao.dataset.feito = '';
        } catch { return; }
        clearTimeout(t);
        t = setTimeout(() => { botao.textContent = copiar; delete botao.dataset.feito; }, 1800);
      };
      bloco.appendChild(botao);
      limpezas.push(() => { clearTimeout(t); botao.remove(); });
    });

    // Índice: a secção visível fica marcada
    const ligacoes = [...document.querySelectorAll<HTMLAnchorElement>('[data-indice] a[href^="#"]')];
    const titulos = ligacoes
      .map((a) => document.getElementById(decodeURIComponent(a.hash.slice(1))))
      .filter((h): h is HTMLElement => Boolean(h));
    if (titulos.length) {
      const marcar = (id: string) => ligacoes.forEach((a) => (decodeURIComponent(a.hash.slice(1)) === id ? a.setAttribute('aria-current', 'true') : a.removeAttribute('aria-current')));
      const obs = new IntersectionObserver(
        (entradas) => {
          // O último título que já passou o topo do ecrã é a secção actual.
          const acima = titulos.filter((h) => h.getBoundingClientRect().top <= window.innerHeight * 0.3);
          const actual = acima.at(-1) ?? (entradas.some((e) => e.isIntersecting) ? titulos[0] : null);
          if (actual) marcar(actual.id);
        },
        { rootMargin: '0px 0px -70% 0px' },
      );
      titulos.forEach((h) => obs.observe(h));
      limpezas.push(() => obs.disconnect());
    }

    return () => limpezas.forEach((f) => f());
  }, [copiar, copiado]);

  return null;
}
