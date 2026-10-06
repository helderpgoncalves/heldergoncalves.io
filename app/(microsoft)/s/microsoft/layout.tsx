import type { Metadata, Viewport } from 'next';
import '../../../globals.css';
import { fontes } from '@/lib/fontes';

export const metadata: Metadata = {
  metadataBase: new URL('https://microsoft.helder.si'),
  title: '🦍 Microsoft — falta quanto para os 50%?',
  description: 'A Microsoft em tempo real, até chegar aos 50% de lucro. Mãos de diamante. 💎🙌',
  robots: { index: false, follow: false },
  openGraph: { title: '🦍 Microsoft — falta quanto para os 50%?', description: 'A Microsoft em tempo real, até chegar aos 50% de lucro. Mãos de diamante. 💎🙌', locale: 'pt_PT', type: 'website' },
};
export const viewport: Viewport = { themeColor: '#070a14', colorScheme: 'dark' };

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-PT" className={fontes}>
      <body>{children}</body>
    </html>
  );
}
