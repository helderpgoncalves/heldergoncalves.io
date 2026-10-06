import type { MetadataRoute } from 'next';
import { SITE } from '@/lib/site';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: '*', allow: '/', disallow: ['/api/', '/escritos/confirmar', '/en/articles/confirm'] }],
    sitemap: `${SITE.canonico}/sitemap.xml`,
    host: SITE.canonico,
  };
}
