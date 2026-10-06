import { Raiz, metaRaiz, viewportRaiz } from '@/components/Raiz';

export const metadata = metaRaiz('pt');
export const viewport = viewportRaiz;

export default function Layout({ children }: { children: React.ReactNode }) {
  return <Raiz lang="pt">{children}</Raiz>;
}
