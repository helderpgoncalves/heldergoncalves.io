// ─────────────────────────────────────────────────────────────
// Acesso às notas do blog. Os ficheiros vivem em
// src/content/blog/<idioma>/<slug>.md — o idioma vem da pasta.
// Devolve já ordenado (mais recente primeiro), sem rascunhos em
// produção, e com o href certo para cada idioma.
// ─────────────────────────────────────────────────────────────
import { getCollection, type CollectionEntry } from 'astro:content';
import type { Lang } from '../siteConfig';

export interface Post {
  entry: CollectionEntry<'blog'>;
  slug: string;      // sem o prefixo do idioma
  href: string;      // /blog/<slug>/ ou /en/blog/<slug>/
  lang: Lang;
  data: CollectionEntry<'blog'>['data'];
  readingMinutes: number;
}

const WPM = 220;

function readingMinutes(body: string): number {
  const words = body.trim().split(/\s+/).length;
  return Math.max(1, Math.round(words / WPM));
}

export async function getPosts(lang: Lang): Promise<Post[]> {
  const all = await getCollection('blog', ({ id, data }) => {
    const inLang = id.startsWith(`${lang}/`);
    return inLang && (import.meta.env.DEV || !data.draft);
  });

  return all
    .map((entry) => {
      const slug = entry.slug.replace(/^(pt|en)\//, '');
      return {
        entry,
        slug,
        href: lang === 'pt' ? `/blog/${slug}/` : `/en/blog/${slug}/`,
        lang,
        data: entry.data,
        readingMinutes: readingMinutes(entry.body),
      };
    })
    .sort((a, b) => b.data.date.valueOf() - a.data.date.valueOf());
}

// O mesmo texto no outro idioma, para o hreflang dos artigos.
export async function getTranslation(
  key: string,
  lang: Lang
): Promise<Post | undefined> {
  const posts = await getPosts(lang);
  return posts.find((p) => p.data.translationKey === key);
}
