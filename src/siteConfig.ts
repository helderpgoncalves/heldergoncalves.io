// ─────────────────────────────────────────────────────────────
// Configuração central do site — SEO, identidade e links.
// Editar aqui reflete em todo o lado (head, JSON-LD, footer).
// ─────────────────────────────────────────────────────────────
export const SITE = {
  url: 'https://heldergoncalves.io',
  name: 'Hélder Gonçalves',
  defaultLang: 'pt' as const,
  locales: ['pt', 'en'] as const,
  email: 'helder@heldergoncalves.io',
  ogImage: '/og.svg', // 1200×630 — placeholder escuro. Trocar por '/og.jpg' quando tiveres imagem raster (melhor suporte em previews sociais).
  social: {
    twitter: 'https://x.com/heldinhoshotgun',
    twitterHandle: '@heldinhoshotgun',
    linkedin: 'https://www.linkedin.com/in/heldergoncalves16/',
    substack: 'https://helderpgoncalves.substack.com/',
  },
};

// Metadados por idioma (title + description) — usados no <head> e OG.
export const META = {
  pt: {
    title: 'Hélder Gonçalves · Developer, criador e IA',
    description:
      'O canto na web do Hélder Gonçalves. Developer que gosta de construir, aprender e criar com tecnologia e inteligência artificial. Trabalho, ideias e escrita.',
  },
  en: {
    title: 'Hélder Gonçalves · Developer, maker & AI',
    description:
      "Hélder Gonçalves's corner of the web. A developer who loves building, learning and creating with technology and artificial intelligence. Work, ideas and writing.",
  },
} as const;

export type Lang = (typeof SITE.locales)[number];
