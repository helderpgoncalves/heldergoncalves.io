import { notFound } from 'next/navigation';
import { PaginaArtigo } from '@/components/PaginaArtigo';
import { artigo, artigos } from '@/lib/escritos';
import { metaArtigo } from '@/lib/seo';

export const dynamicParams = false;
export const generateStaticParams = () => artigos('en').map((a) => ({ slug: a.slug }));

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props) {
  const a = artigo('en', (await params).slug);
  return a ? metaArtigo(a) : {};
}

export default async function Pagina({ params }: Props) {
  const a = artigo('en', (await params).slug);
  if (!a) notFound();
  return <PaginaArtigo a={a} />;
}
