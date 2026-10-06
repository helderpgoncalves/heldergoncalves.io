import type { Metadata } from 'next';
import '../../../globals.css';
import { fontes } from '@/lib/fontes';

// Cada mini-app tem o seu próprio layout de raiz: pode ter outro aspecto, outra língua, outra tudo.
export const metadata: Metadata = {
  metadataBase: new URL('https://lab.helder.si'),
  title: { default: 'Lab', template: '%s — Lab' },
  description: 'Experiências e mini-apps.',
  robots: { index: false, follow: false },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-PT" className={fontes}>
      <body>{children}</body>
    </html>
  );
}
