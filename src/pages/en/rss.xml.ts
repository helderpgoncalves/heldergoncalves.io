// RSS feed for the English notes.
import rss from '@astrojs/rss';
import type { APIContext } from 'astro';
import { SITE } from '../../siteConfig';
import { useT } from '../../i18n/ui';
import { getPosts } from '../../lib/posts';

export async function GET(context: APIContext) {
  const t = useT('en');
  const posts = await getPosts('en');

  return rss({
    title: `${SITE.name} — ${t('writing.index.title')}`,
    description: t('writing.index.description'),
    site: context.site ?? SITE.url,
    customData: '<language>en</language>',
    items: posts.map((post) => ({
      title: post.data.title,
      description: post.data.description,
      pubDate: post.data.date,
      link: post.href,
      categories: post.data.tags,
    })),
  });
}
