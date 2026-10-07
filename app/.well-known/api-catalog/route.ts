import { SITE } from '@/lib/site';

// RFC 9727: o catálogo das APIs do site, em linkset (RFC 9264).
export const dynamic = 'force-static';
export const GET = () =>
  new Response(
    JSON.stringify({
      linkset: [
        {
          anchor: `${SITE.canonico}/api/subscribe`,
          'service-desc': [{ href: `${SITE.canonico}/openapi.json`, type: 'application/vnd.oai.openapi+json' }],
          'service-doc': [{ href: `${SITE.canonico}/llms.txt`, type: 'text/plain' }],
          status: [{ href: `${SITE.canonico}/api/health`, type: 'application/json' }],
        },
      ],
    }),
    { headers: { 'Content-Type': 'application/linkset+json', 'Cache-Control': 'public, max-age=3600' } },
  );
