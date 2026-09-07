// ─────────────────────────────────────────────────────────────────────
// As duas línguas, juntas.
//
// A tipagem faz o trabalho de conferência que ninguém quer fazer à mão:
// `EN` tem de ter exactamente a forma de `PT`. Acrescentar uma chave só
// num dos ficheiros deixa de compilar, e é para isso que serve.
// ─────────────────────────────────────────────────────────────────────
import { PT } from './copy.pt';
import { EN } from './copy.en';
import type { Lang } from './site';

/** A forma do texto do site. É o português que a define. */
export type Copy = typeof PT;

const EN_TYPED: Copy = EN;

export const COPY: Record<Lang, Copy> = { pt: PT, en: EN_TYPED };
