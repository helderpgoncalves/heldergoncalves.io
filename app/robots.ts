import type { MetadataRoute } from 'next';
import { linguas, rotas } from '@/lib/copy';
import { SITE } from '@/lib/site';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: '*', allow: '/', disallow: ['/api/', ...linguas.map((l) => rotas[l].confirmar)] }],
    sitemap: `${SITE.canonico}/sitemap.xml`,
    host: SITE.canonico,
  };
}
