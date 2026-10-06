import type { MetadataRoute } from 'next';
import { rotas } from '@/lib/copy';
import { artigos, traducao } from '@/lib/escritos';
import { abs } from '@/lib/seo';

export default function sitemap(): MetadataRoute.Sitemap {
  const par = (pt: string, en: string) => ({ languages: { 'pt-PT': abs(pt), en: abs(en), 'x-default': abs(pt) } });
  const recente = artigos('pt')[0]?.data ?? artigos('en')[0]?.data;

  const paginas: MetadataRoute.Sitemap = [
    { url: abs(rotas.pt.inicio), lastModified: recente, changeFrequency: 'monthly', priority: 1, alternates: par(rotas.pt.inicio, rotas.en.inicio) },
    { url: abs(rotas.en.inicio), lastModified: recente, changeFrequency: 'monthly', priority: 1, alternates: par(rotas.pt.inicio, rotas.en.inicio) },
    { url: abs(rotas.pt.escritos), lastModified: recente, changeFrequency: 'weekly', priority: 0.8, alternates: par(rotas.pt.escritos, rotas.en.escritos) },
    { url: abs(rotas.en.escritos), lastModified: recente, changeFrequency: 'weekly', priority: 0.8, alternates: par(rotas.pt.escritos, rotas.en.escritos) },
  ];

  for (const lang of ['pt', 'en'] as const) {
    for (const a of artigos(lang)) {
      const t = traducao(a);
      paginas.push({
        url: abs(rotas[lang].artigo(a.slug)),
        lastModified: a.data,
        changeFrequency: 'yearly',
        priority: 0.7,
        alternates: t ? par(rotas.pt.artigo(lang === 'pt' ? a.slug : t.slug), rotas.en.artigo(lang === 'en' ? a.slug : t.slug)) : undefined,
      });
    }
  }
  return paginas;
}
