import type { MetadataRoute } from 'next';

// A página de bio é instalável e abre sempre na própria bio (sem isto, o domínio da bio pedia o manifest do site e dava 404).
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Hélder Gonçalves · Ligações',
    short_name: 'Hélder',
    description: 'O blog, os projetos e como falar comigo.',
    start_url: '/',
    display: 'standalone',
    background_color: '#070a14',
    theme_color: '#070a14',
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
    ],
  };
}
