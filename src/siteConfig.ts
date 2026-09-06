// ─────────────────────────────────────────────────────────────
// Configuração central — identidade, links e SEO base.
// Um sítio só para editar; reflete-se em head, JSON-LD e rodapé.
// ─────────────────────────────────────────────────────────────
export const SITE = {
  url: 'https://heldergoncalves.io',
  name: 'Hélder Gonçalves',
  defaultLang: 'pt' as const,
  locales: ['pt', 'en'] as const,
  email: 'helder@heldergoncalves.io',
  location: { pt: 'Barcelos, Portugal', en: 'Barcelos, Portugal' },
  ogImage: '/og.png', // PNG: as redes sociais não renderizam SVG em previews
  github: 'https://github.com/helderpgoncalves',
  githubUser: 'helderpgoncalves',
  social: {
    github: 'https://github.com/helderpgoncalves',
    twitter: 'https://x.com/heldinhoshotgun',
    twitterHandle: '@heldinhoshotgun',
    linkedin: 'https://www.linkedin.com/in/heldergoncalves16/',
  },
  company: { name: 'Bitsapiens', url: 'https://bitsapiens.io/' },
  // Ponto verde + "Disponível para projetos" no topo da home.
  // Mudar para false quando não houver disponibilidade.
  available: true,
};

export type Lang = (typeof SITE.locales)[number];

// Caminho da mesma página no outro idioma (para o hreflang e o switcher).
export function altPath(pathname: string, to: Lang): string {
  const clean = pathname.replace(/\/+$/, '') || '/';
  const isEn = clean === '/en' || clean.startsWith('/en/');
  const base = isEn ? clean.replace(/^\/en/, '') || '/' : clean;
  if (to === 'en') return base === '/' ? '/en/' : `/en${base}/`.replace(/\/+$/, '/');
  return base === '/' ? '/' : `${base}/`.replace(/\/+$/, '/');
}
