import rss from '@astrojs/rss';
import { SITE } from '../siteConfig';
import { getSubstackPosts } from '../lib/substack';

// Feed RSS do TEU domínio (/rss.xml), alimentado pelo feed do Substack.
// Os links apontam para as páginas do teu site (não para o Substack).
export async function GET(context) {
  const posts = await getSubstackPosts();

  return rss({
    title: `${SITE.name} — Blog`,
    description: 'Notas sobre desenvolvimento, inteligência artificial e as coisas que vou construindo.',
    site: context.site ?? SITE.url,
    items: posts.map((post) => ({
      title: post.title,
      description: post.description,
      pubDate: post.pubDate,
      link: `/blog/${post.slug}/`,
    })),
    customData: `<language>pt-PT</language>`,
  });
}
