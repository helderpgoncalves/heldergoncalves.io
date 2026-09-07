// ─────────────────────────────────────────────────────────────────────
// Rotas, datas e ligações — o que se calcula a partir do resto.
// ─────────────────────────────────────────────────────────────────────
import { SITE, type Lang } from './site';
import { COPY } from './copy';

// Rotas por língua, num sítio só.
export const ROUTES = {
  pt: { home: '/', blog: '/blog/', feed: '/rss.xml' },
  en: { home: '/en/', blog: '/en/blog/', feed: '/en/rss.xml' },
} as const;

export const other = (lang: Lang): Lang => (lang === 'pt' ? 'en' : 'pt');

export function formatDate(date: Date, lang: Lang): string {
  return new Intl.DateTimeFormat(COPY[lang].intlLocale, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(date);
}

export function readingMinutes(body: string): number {
  const words = body.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
}

/** Links externos, na ordem em que aparecem em todo o lado. */
export function socialLinks(lang: Lang) {
  const l = COPY[lang].labels;
  return [
    { id: 'email', label: l.email, value: SITE.email, href: `mailto:${SITE.email}` },
    { id: 'github', label: l.github, value: SITE.githubHandle, href: SITE.github },
    { id: 'linkedin', label: l.linkedin, value: 'heldergoncalves16', href: SITE.linkedin },
    { id: 'twitter', label: l.twitter, value: SITE.twitterHandle, href: SITE.twitter },
  ];
}
