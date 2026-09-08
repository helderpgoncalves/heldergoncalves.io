// Acesso aos escritos. Uma coleção só, separada por pasta de língua.
import { getCollection, type CollectionEntry } from 'astro:content';
import { ROUTES, type Lang } from '../siteConfig';

export type Post = CollectionEntry<'blog'>;

/** 'pt/porque-voltei-a-escrever' → 'porque-voltei-a-escrever' */
export const postSlug = (post: Post): string => post.id.replace(/^(pt|en)\//, '');

export const postPath = (post: Post, lang: Lang): string =>
  `${ROUTES[lang].blog}${postSlug(post)}/`;

/** Publicados, na língua pedida, do mais recente para o mais antigo. */
export async function getPosts(lang: Lang): Promise<Post[]> {
  const posts = await getCollection(
    'blog',
    (entry) => entry.id.startsWith(`${lang}/`) && entry.data.draft !== true
  );
  return posts.sort((a, b) => b.data.date.valueOf() - a.data.date.valueOf());
}

/** O mesmo texto na outra língua, se existir (ligado pelo campo `key`). */
export async function getTranslation(post: Post, otherLang: Lang): Promise<Post | undefined> {
  if (!post.data.key) return undefined;
  const others = await getPosts(otherLang);
  return others.find((p) => p.data.key === post.data.key);
}
