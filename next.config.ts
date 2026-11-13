import type { NextConfig } from 'next';

const prod = process.env.NODE_ENV === 'production';

// Next precisa de scripts em linha para arrancar; tudo o resto fica preso ao próprio site.
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${prod ? '' : " 'unsafe-eval'"}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self'",
  "connect-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  prod ? 'upgrade-insecure-requests' : '',
].filter(Boolean).join('; ');

const seguranca = [
  { key: 'Content-Security-Policy', value: csp },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()' },
  { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
  ...(prod ? [{ key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains' }] : []),
];

const config: NextConfig = {
  output: 'standalone', // imagem de Docker pequena: só o que o servidor precisa
  // O sharp só serve para gerar imagens (scripts/imagens.mjs), nunca em execução: fora da imagem.
  outputFileTracingExcludes: { '*': ['node_modules/sharp/**', 'node_modules/@img/**'] },
  experimental: { globalNotFound: true }, // um 404 só, com as duas línguas, apesar das várias raízes
  agentRules: false, // não gerar AGENTS.md
  devIndicators: false, // o selo do Next em desenvolvimento tapava o avatar do chat no telemóvel
  poweredByHeader: false,
  reactStrictMode: true,
  async headers() {
    return [
      { source: '/:path*', headers: seguranca },
      // Descoberta para agentes (RFC 8288): o sitemap, o catálogo de APIs, as skills e o resumo em texto.
      // `Vary: Accept` porque as mesmas páginas também saem em Markdown a quem o pedir.
      { source: '/:path*', headers: [{ key: 'Vary', value: 'Accept' }] },
      {
        source: '/',
        headers: [{ key: 'Link', value: [
          '</sitemap.xml>; rel="sitemap"',
          '</.well-known/api-catalog>; rel="api-catalog"; type="application/linkset+json"',
          '</.well-known/agent-skills/index.json>; rel="describedby"; type="application/json"',
          '</llms.txt>; rel="describedby"; type="text/plain"',
          '</blog/feed.xml>; rel="alternate"; type="application/rss+xml"',
        ].join(', ') }],
      },
      { source: '/img/:path*', headers: [{ key: 'Cache-Control', value: 'public, max-age=604800, stale-while-revalidate=86400' }] },
      { source: '/api/:path*', headers: [{ key: 'Cache-Control', value: 'no-store' }] },
    ];
  },

  // helder.si (e www.*) segue para o domínio canónico, para o Google juntar os sinais num só.
  async redirects() {
    const paraApex = ['helder.si', 'www.helder.si', 'www.heldergoncalves.io'].map((host) => ({
      source: '/:path*',
      has: [{ type: 'host' as const, value: host }],
      destination: 'https://heldergoncalves.io/:path*',
      permanent: true,
    }));
    // Os URLs de antes de o espaço se chamar Blog continuam a funcionar (e passam o que valiam).
    const antigos = [
      { source: '/escritos/:path*', destination: '/blog/:path*', permanent: true },
      { source: '/en/articles/:path*', destination: '/en/blog/:path*', permanent: true },
    ];
    return [...paraApex, ...antigos];
  },
};

export default config;
