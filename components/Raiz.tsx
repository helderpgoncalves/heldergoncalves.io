import type { Metadata, Viewport } from 'next';
import '../app/globals.css';
import { fontes } from '@/lib/fontes';
import { copy, htmlLang, type Lang } from '@/lib/copy';
import { SITE } from '@/lib/site';

export const viewportRaiz: Viewport = { themeColor: '#070a14', colorScheme: 'dark light' };

export function metaRaiz(lang: Lang): Metadata {
  return {
    metadataBase: new URL(SITE.canonico),
    applicationName: SITE.nome,
    title: { default: copy[lang].titulo, template: `%s — ${SITE.nome}` },
    authors: [{ name: SITE.nome, url: SITE.canonico }],
    creator: SITE.nome,
    formatDetection: { email: false, address: false, telephone: false },
    alternates: { types: { 'application/rss+xml': [{ url: lang === 'pt' ? '/blog/feed.xml' : '/en/blog/feed.xml', title: copy[lang].blog.titulo }] } },
  };
}

export function Raiz({ lang, children }: { lang: Lang; children: React.ReactNode }) {
  return (
    <html lang={htmlLang[lang]} className={fontes}>
      <body>{children}</body>
    </html>
  );
}
