import { Raiz, metaRaiz, viewportRaiz } from '@/components/Raiz';

export const metadata = metaRaiz('en');
export const viewport = viewportRaiz;

export default function Layout({ children }: { children: React.ReactNode }) {
  return <Raiz lang="en">{children}</Raiz>;
}
