import { artigos as todos, artigo as um, renderizar } from './md.mjs';
import type { Lang } from './copy';

export type Artigo = {
  slug: string;
  lang: Lang;
  titulo: string;
  resumo: string;
  data: string;
  etiquetas: string[];
  fonte: { nome: string; url: string } | null;
  par: string;
  minutos: number;
  md: string;
};

export const artigos = (lang: Lang) => todos(lang) as Artigo[];
export const artigo = (lang: Lang, slug: string) => um(lang, slug) as Artigo | null;
export const html = (a: Artigo) => renderizar(a.md) as string;

/** A mesma peça na outra língua, ligada pelo campo `par` do cabeçalho. */
export const traducao = (a: Artigo) => artigo(a.lang === 'pt' ? 'en' : 'pt', a.par);

export const dataLonga = (iso: string, lang: Lang) =>
  new Intl.DateTimeFormat(lang === 'pt' ? 'pt-PT' : 'en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(iso + 'T00:00:00Z'));
