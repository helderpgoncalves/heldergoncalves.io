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
  poweredByHeader: false,
  reactStrictMode: true,
  async headers() {
    return [
      { source: '/:path*', headers: seguranca },
      { source: '/img/:path*', headers: [{ key: 'Cache-Control', value: 'public, max-age=604800, stale-while-revalidate=86400' }] },
      { source: '/api/:path*', headers: [{ key: 'Cache-Control', value: 'no-store' }] },
    ];
  },

  // Um sítio, dois endereços: tudo o que não for heldergoncalves.io segue para lá (301),
  // para o Google juntar os sinais num só domínio.
  async redirects() {
    const paraApex = ['helder.si', 'www.helder.si', 'www.heldergoncalves.io'].map((host) => ({
      source: '/:path*',
      has: [{ type: 'host' as const, value: host }],
      destination: 'https://heldergoncalves.io/:path*',
      permanent: true,
    }));
    // lab.helder.si → lab.heldergoncalves.io: o alias acompanha as mini-apps.
    const subdominios = {
      source: '/:path*',
      has: [{ type: 'host' as const, value: '(?<sub>[a-z0-9-]+)\\.helder\\.si' }],
      destination: 'https://:sub.heldergoncalves.io/:path*',
      permanent: true,
    };
    return [...paraApex, subdominios];
  },
};

export default config;
