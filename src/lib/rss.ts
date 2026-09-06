// Feed RSS escrito à mão — evita mais uma dependência para 30 linhas de XML.
import { SITE, COPY, ROUTES, type Lang } from '../siteConfig';
import { getPosts, postPath } from './posts';

const escape = (s: string) =>
  s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');

export async function buildFeed(lang: Lang): Promise<Response> {
  const c = COPY[lang];
  const posts = await getPosts(lang);
  const self = new URL(ROUTES[lang].feed, SITE.url).href;
  const home = new URL(ROUTES[lang].blog, SITE.url).href;

  const items = posts
    .map((post) => {
      const url = new URL(postPath(post, lang), SITE.url).href;
      return `    <item>
      <title>${escape(post.data.title)}</title>
      <link>${url}</link>
      <guid isPermaLink="true">${url}</guid>
      <description>${escape(post.data.description)}</description>
      <pubDate>${post.data.date.toUTCString()}</pubDate>
${post.data.tags.map((t) => `      <category>${escape(t)}</category>`).join('\n')}
    </item>`;
    })
    .join('\n');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escape(`${SITE.name} — ${c.escritos.title}`)}</title>
    <link>${home}</link>
    <description>${escape(c.escritos.description)}</description>
    <language>${c.htmlLang}</language>
    <atom:link href="${self}" rel="self" type="application/rss+xml" />
    <lastBuildDate>${(posts[0]?.data.date ?? new Date()).toUTCString()}</lastBuildDate>
${items}
  </channel>
</rss>
`;

  return new Response(xml, {
    headers: { 'Content-Type': 'application/xml; charset=utf-8' },
  });
}
