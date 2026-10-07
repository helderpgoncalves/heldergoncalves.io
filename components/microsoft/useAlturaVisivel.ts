'use client';

import { useEffect } from 'react';

/**
 * No telemóvel, o teclado encolhe a zona visível mas não a página: o compositor ficava tapado.
 * Isto escreve a altura realmente visível em `--app-h`, e a app usa-a como altura. Tudo o que está
 * "colado ao fundo" passa então a ficar logo acima do teclado, e não por baixo dele.
 */
export function useAlturaVisivel() {
  useEffect(() => {
    const vv = window.visualViewport;
    const raiz = document.documentElement;
    if (!vv) return;
    const aplicar = () => {
      raiz.style.setProperty('--app-h', `${Math.round(vv.height)}px`);
      // O iOS sobe a página quando o teclado abre; aqui a app é toda de altura fixa, por isso volta ao topo.
      if (vv.offsetTop > 0) window.scrollTo(0, 0);
    };
    aplicar();
    vv.addEventListener('resize', aplicar);
    vv.addEventListener('scroll', aplicar);
    return () => { vv.removeEventListener('resize', aplicar); vv.removeEventListener('scroll', aplicar); raiz.style.removeProperty('--app-h'); };
  }, []);
}
