import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

// Domínio final — usado para canonical, sitemap e Open Graph.
export default defineConfig({
  site: 'https://heldergoncalves.io',
  integrations: [
    sitemap({
      // Exclui o endpoint RSS (não é uma página HTML indexável).
      filter: (page) => !page.endsWith('/rss.xml'),
    }),
  ],
  build: {
    // CSS inline pequeno automaticamente → menos requests, melhor LCP.
    inlineStylesheets: 'auto',
  },
  compressHTML: true,
});
