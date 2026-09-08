import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  site: 'https://heldergoncalves.io',
  i18n: {
    defaultLocale: 'pt',
    locales: ['pt', 'en'],
    routing: { prefixDefaultLocale: false },
  },
  integrations: [sitemap({
    filter: (page) =>
      !page.includes('/404') &&
      !/\.(xml|txt|json)$/.test(page),
    i18n: { defaultLocale: 'pt', locales: { pt: 'pt-PT', en: 'en' } },
  })],
  build: { inlineStylesheets: 'auto' },
  compressHTML: true,
  // Em `npm run dev` sozinho não há API por trás — as chamadas a /api
  // falham como sempre falharam, sem isto mudar nada. Só entra em jogo
  // quando API_PROXY_TARGET está definida: é o docker-compose.dev.yml
  // que a põe, para o Astro (com HMR) e o uvicorn --reload (a API)
  // correrem lado a lado atrás de uma porta só.
  //
  // Tailwind 4 é plugin do Vite, não integração Astro (ver os.css para
  // a directiva @import e o motivo de não haver tailwind.config.mjs).
  vite: {
    plugins: [tailwindcss()],
    server: process.env.API_PROXY_TARGET
      ? { proxy: { '/api': { target: process.env.API_PROXY_TARGET, changeOrigin: true } } }
      : {},
  },
});