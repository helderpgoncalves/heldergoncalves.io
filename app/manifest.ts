import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Hélder Gonçalves',
    short_name: 'Hélder',
    description: 'Software que pensa antes de falar.',
    start_url: '/',
    display: 'standalone',
    background_color: '#070a14',
    theme_color: '#070a14',
    icons: [{ src: '/icon.svg', sizes: 'any', type: 'image/svg+xml' }, { src: '/apple-icon.png', sizes: '180x180', type: 'image/png' }],
  };
}
