// Dados estruturados (schema.org) — o que o Google lê para perceber
// quem é a pessoa e o que é cada texto.
import { SITE, COPY, type Lang } from '../siteConfig';
import type { Post } from './posts';

const abs = (path: string) => new URL(path, SITE.url).href;

export function personLd(lang: Lang) {
  const c = COPY[lang];
  return {
    '@context': 'https://schema.org',
    '@type': 'Person',
    '@id': `${SITE.url}/#person`,
    name: SITE.name,
    url: SITE.url,
    email: `mailto:${SITE.email}`,
    jobTitle: c.role,
    description: c.description,
    image: abs(SITE.ogImage),
    address: { '@type': 'PostalAddress', addressLocality: 'Barcelos', addressCountry: 'PT' },
    worksFor: { '@type': 'Organization', name: SITE.company.name, url: SITE.company.url },
    sameAs: [SITE.github, SITE.linkedin, SITE.twitter],
    knowsAbout: [
      'Software engineering',
      'Artificial intelligence',
      'Large language models',
      'AI agents',
      'Model Context Protocol',
      'Automation',
      'TypeScript',
      'Python',
    ],
  };
}

export function blogLd(lang: Lang, blogUrl: string, posts: { title: string; url: string }[]) {
  const c = COPY[lang];
  return {
    '@context': 'https://schema.org',
    '@type': 'Blog',
    name: `${SITE.name} — ${c.blog.title}`,
    url: blogUrl,
    description: c.blog.description,
    inLanguage: c.htmlLang,
    author: { '@id': `${SITE.url}/#person` },
    blogPost: posts.map((p) => ({ '@type': 'BlogPosting', headline: p.title, url: p.url })),
  };
}

export function articleLd(post: Post, lang: Lang, url: string) {
  const c = COPY[lang];
  return {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: post.data.title,
    description: post.data.description,
    url,
    mainEntityOfPage: url,
    datePublished: post.data.date.toISOString(),
    dateModified: (post.data.updated ?? post.data.date).toISOString(),
    inLanguage: c.htmlLang,
    keywords: post.data.tags.join(', '),
    image: abs(SITE.ogImage),
    author: { '@id': `${SITE.url}/#person` },
    publisher: { '@id': `${SITE.url}/#person` },
  };
}
