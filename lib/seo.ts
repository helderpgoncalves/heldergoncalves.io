import type { Metadata } from 'next';
import { copy, htmlLang, linguaPadrao, linguas, locale, rotas, type Lang } from './copy';
import { traducao, type Artigo } from './blog';
import { SITE } from './site';

type Args = {
  lang: Lang;
  titulo?: string;            // sem o sufixo do nome: o modelo acrescenta-o
  tituloAbsoluto?: string;
  descricao: string;
  caminho: string;            // caminho desta página
  alt?: Partial<Record<Lang, string>>; // a mesma página noutras línguas (inclui a própria)
  tipo?: 'website' | 'article';
  data?: string;
  etiquetas?: string[];
  privado?: boolean;
};

export function meta({ lang, titulo, tituloAbsoluto, descricao, caminho, alt, tipo = 'website', data, etiquetas, privado }: Args): Metadata {
  const languages: Record<string, string> = {};
  if (alt) {
    for (const l of linguas) if (alt[l]) languages[htmlLang[l]] = alt[l]!;
    languages['x-default'] = alt[linguaPadrao] ?? Object.values(alt)[0]!;
  }
  const t = tituloAbsoluto ?? titulo ?? copy[lang].titulo;
  return {
    title: tituloAbsoluto ? { absolute: tituloAbsoluto } : titulo,
    description: descricao,
    alternates: { canonical: caminho, languages: alt ? languages : undefined },
    robots: privado ? { index: false, follow: false } : { index: true, follow: true, 'max-image-preview': 'large', 'max-snippet': -1 },
    openGraph: {
      type: tipo,
      siteName: SITE.nome,
      title: t,
      description: descricao,
      url: caminho,
      locale: locale[lang],
      alternateLocale: linguas.filter((l) => l !== lang).map((l) => locale[l]),
      images: [{ url: '/og.jpg', width: 1200, height: 630, alt: copy[lang].imagem }],
      ...(tipo === 'article' ? { publishedTime: data, authors: [SITE.nome], tags: etiquetas } : {}),
    },
    twitter: { card: 'summary_large_image', title: t, description: descricao, images: ['/og.jpg'] },
  };
}

// A raiz sem barra final, igual ao canónico que o Next emite.
export const abs = (caminho: string) => (caminho === '/' ? SITE.canonico : new URL(caminho, SITE.canonico).toString());

/** Metadados de um artigo, partilhados pelas duas línguas. */
export function metaArtigo(a: Artigo): Metadata {
  const outra = traducao(a);
  return meta({
    lang: a.lang,
    titulo: a.titulo,
    descricao: a.resumo,
    caminho: rotas[a.lang].artigo(a.slug),
    // Cada página aponta para si própria e para as suas traduções, se existirem.
    alt: { [a.lang]: rotas[a.lang].artigo(a.slug), ...(outra && { [outra.lang]: rotas[outra.lang].artigo(outra.slug) }) },
    tipo: 'article',
    data: a.data,
    etiquetas: a.etiquetas,
  });
}
