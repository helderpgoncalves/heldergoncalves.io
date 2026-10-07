import { artigos as todos, artigo as um, renderizar, indice as titulos, figura, imagemOg, imagemGrande, infoImagem, slugar } from './md.mjs';
import type { Lang } from './copy';

export type Capa = { imagem: string; alt: string; legenda: string | null; credito: string | null };

export type Artigo = {
  slug: string;
  lang: Lang;
  titulo: string;
  resumo: string;
  data: string;
  atualizado: string | null;
  capa: Capa | null;
  etiquetas: string[];
  fonte: { nome: string; url: string } | null;
  rascunho: boolean;
  serie: string | null;
  parte: number | null;
  par: string;
  minutos: number;
  palavras: number;
  md: string;
};

export type Titulo = { id: string; texto: string; nivel: 2 | 3 };

export const artigos = (lang: Lang) => todos(lang) as Artigo[];
export const artigo = (lang: Lang, slug: string) => um(lang, slug) as Artigo | null;
export const html = (a: Artigo) => renderizar(a.md) as string;
/** Versão para feed e e-mail: imagens simples, sem realce nem âncoras. */
export const htmlSimples = (a: Artigo) => renderizar(a.md, { simples: true }) as string;
export const indice = (a: Artigo) => titulos(a.md) as Titulo[];

/** A mesma peça na outra língua, ligada pelo campo `par` do cabeçalho. */
export const traducao = (a: Artigo) => artigo(a.lang === 'pt' ? 'en' : 'pt', a.par);

/** Data de última alteração (a de publicação, se nunca foi mexido). */
export const modificado = (a: Artigo) => a.atualizado ?? a.data;

export const dataLonga = (iso: string, lang: Lang) =>
  new Intl.DateTimeFormat(lang === 'pt' ? 'pt-PT' : 'en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(iso + 'T00:00:00Z'));

/* ---------- imagens ---------- */

type OpcoesFigura = { alt?: string; legenda?: string; credito?: string; larga?: boolean; ansiosa?: boolean; sizes?: string; classe?: string };
export const figuraHtml = (chave: string, o: OpcoesFigura = {}) => figura(chave, o) as string;
/** Dimensões e cartão de partilha da capa de um artigo (ou null, se não tem capa). */
export function imagemDe(a: Artigo) {
  if (!a.capa) return null;
  const i = infoImagem(a.capa.imagem) as { w: number; h: number } | null;
  const og = imagemOg(a.capa.imagem) as string | null;
  const grande = imagemGrande(a.capa.imagem) as string | null;
  return i && grande ? { ...i, og, grande, alt: a.capa.alt } : null;
}

/* ---------- etiquetas e artigos relacionados ---------- */

export const slugEtiqueta = (e: string) => slugar(e) as string;

/** Todas as etiquetas de uma língua, da mais usada para a menos usada. */
export function etiquetas(lang: Lang) {
  const mapa = new Map<string, { nome: string; slug: string; artigos: Artigo[] }>();
  for (const a of artigos(lang)) {
    for (const nome of a.etiquetas) {
      const slug = slugEtiqueta(nome);
      if (!slug) continue;
      const e = mapa.get(slug) ?? { nome, slug, artigos: [] };
      e.artigos.push(a);
      mapa.set(slug, e);
    }
  }
  return [...mapa.values()].sort((x, y) => y.artigos.length - x.artigos.length || x.nome.localeCompare(y.nome));
}
export const etiqueta = (lang: Lang, slug: string) => etiquetas(lang).find((e) => e.slug === slug) ?? null;

/** Uma etiqueta com um só texto é uma página fina: existe para os leitores, mas não para o Google. */
export const MIN_INDEXAVEL = 2;

/** Os artigos mais parecidos (pelas etiquetas em comum); completa com os mais recentes. */
export function relacionados(a: Artigo, n = 3) {
  const meus = new Set(a.etiquetas.map(slugEtiqueta));
  return artigos(a.lang)
    .filter((x) => x.slug !== a.slug)
    .map((x) => ({ x, pontos: x.etiquetas.filter((e) => meus.has(slugEtiqueta(e))).length }))
    .sort((p, q) => q.pontos - p.pontos || q.x.data.localeCompare(p.x.data))
    .slice(0, n)
    .map((p) => p.x);
}

/* ---------- séries ---------- */

/** As partes publicadas da série deste texto, por ordem. Um texto sem série devolve null. */
export function serieDe(a: Artigo) {
  if (!a.serie) return null;
  const nome = a.serie;
  const partes = artigos(a.lang).filter((x) => x.serie && slugEtiqueta(x.serie) === slugEtiqueta(nome)).sort((x, y) => (x.parte ?? 0) - (y.parte ?? 0));
  const i = partes.findIndex((x) => x.slug === a.slug);
  return { nome, partes, anterior: partes[i - 1] ?? null, seguinte: partes[i + 1] ?? null };
}
