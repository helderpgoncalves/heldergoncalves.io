import { artigos, html } from './blog';
import { copy, rotas, htmlLang, type Lang } from './copy';
import { SITE } from './site';
import { abs } from './seo';

const xml = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' })[c]!);
const cdata = (s: string) => `<![CDATA[${s.replaceAll(']]>', ']]]]><![CDATA[>')}]]>`;
// Dentro do feed os caminhos relativos têm de ser absolutos.
const absolutos = (h: string) => h.replace(/(href|src)="\/(?!\/)/g, `$1="${SITE.canonico}/`);

export function feed(lang: Lang): Response {
  const lista = artigos(lang);
  const c = copy[lang];
  const itens = lista
    .map(
      (a) => `<item>
<title>${xml(a.titulo)}</title>
<link>${abs(rotas[lang].artigo(a.slug))}</link>
<guid isPermaLink="true">${abs(rotas[lang].artigo(a.slug))}</guid>
<pubDate>${new Date(a.data + 'T12:00:00Z').toUTCString()}</pubDate>
<description>${xml(a.resumo)}</description>
${a.etiquetas.map((e) => `<category>${xml(e)}</category>`).join('')}
<content:encoded>${cdata(absolutos(html(a)))}</content:encoded>
</item>`,
    )
    .join('\n');
  const corpo = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:content="http://purl.org/rss/1.0/modules/content/">
<channel>
<title>${xml(`${c.blog.titulo} — ${SITE.nome}`)}</title>
<link>${abs(rotas[lang].blog)}</link>
<description>${xml(c.blog.descricao)}</description>
<language>${htmlLang[lang]}</language>
<atom:link href="${abs(rotas[lang].feed)}" rel="self" type="application/rss+xml"/>
${lista[0] ? `<lastBuildDate>${new Date(lista[0].data + 'T12:00:00Z').toUTCString()}</lastBuildDate>` : ''}
${itens}
</channel>
</rss>`;
  return new Response(corpo, { headers: { 'Content-Type': 'application/rss+xml; charset=utf-8', 'Cache-Control': 'public, max-age=3600' } });
}
