import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

// Domínio final — usado para canonical, sitemap, hreflang e Open Graph.
export default defineConfig({
  site: 'https://heldergoncalves.io',
  // Português na raiz (/), inglês em /en/. Duas páginas reais, não um
  // toggle em JavaScript: é o que o Google consegue indexar.
  i18n: {
    defaultLocale: 'pt',
    locales: ['pt', 'en'],
    routing: { prefixDefaultLocale: false },
  },
  integrations: [
    sitemap({
      filter: (page) => !page.includes('/rss.xml'),
      i18n: {
        defaultLocale: 'pt',
        locales: { pt: 'pt-PT', en: 'en' },
      },
    }),
  ],
  build: { inlineStylesheets: 'auto' },
  compressHTML: true,
});
