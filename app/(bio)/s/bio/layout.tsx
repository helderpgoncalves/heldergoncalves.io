import type { Metadata, Viewport } from 'next';
import '../../../globals.css';
import { fontes } from '@/lib/fontes';
import { SITE } from '@/lib/site';

// Esta página é a "bio" do Instagram: leve, uma coluna, indexável (o Google deve ligá-la ao resto do site).
export const metadata: Metadata = {
  metadataBase: new URL(SITE.bio),
  title: { absolute: `${SITE.nome} · Ligações` },
  description: `Todas as ligações de ${SITE.nome} num só sítio: o blog, os projetos e como falar comigo.`,
  alternates: { canonical: '/' },
  authors: [{ name: SITE.nome, url: SITE.canonico }],
  creator: SITE.nome,
  keywords: [SITE.nome, 'Helder Goncalves', SITE.instagramNome, 'blog', 'software'],
  robots: { index: true, follow: true, 'max-image-preview': 'large' },
  openGraph: { type: 'profile', siteName: SITE.nome, title: `${SITE.nome} · Ligações`, description: 'O blog, os projetos e como falar comigo.', url: '/', locale: 'pt_PT', images: [{ url: `${SITE.canonico}/og.jpg`, width: 1200, height: 630 }] },
  twitter: { card: 'summary_large_image', title: `${SITE.nome} · Ligações`, images: [`${SITE.canonico}/og.jpg`] },
};
export const viewport: Viewport = { themeColor: '#070a14', colorScheme: 'dark' };

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-PT" className={fontes}>
      <body>{children}</body>
    </html>
  );
}
