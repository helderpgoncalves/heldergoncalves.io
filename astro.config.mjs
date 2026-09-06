import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://heldergoncalves.io',
  i18n: {
    defaultLocale: 'pt',
    locales: ['pt', 'en'],
    routing: { prefixDefaultLocale: false },
  },
  integrations: [
    sitemap({
      filter: (page) => !page.includes('/404'),
      i18n: { defaultLocale: 'pt', locales: { pt: 'pt-PT', en: 'en' } },
    }),
  ],
  build: { inlineStylesheets: 'always' },
  compressHTML: true,
});
