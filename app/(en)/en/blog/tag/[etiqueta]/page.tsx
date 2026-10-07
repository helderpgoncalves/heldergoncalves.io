import { notFound } from 'next/navigation';
import { PaginaEtiqueta } from '@/components/PaginaEtiqueta';
import { copy, rotas } from '@/lib/copy';
import { MIN_INDEXAVEL, etiqueta, etiquetas } from '@/lib/blog';
import { meta } from '@/lib/seo';

export const dynamicParams = false;
export const generateStaticParams = () => etiquetas('en').map((e) => ({ etiqueta: e.slug }));

type Props = { params: Promise<{ etiqueta: string }> };

export async function generateMetadata({ params }: Props) {
  const slug = (await params).etiqueta;
  const e = etiqueta('en', slug);
  if (!e) return {};
  const c = copy.en.blog;
  return meta({
    lang: 'en',
    titulo: c.etiquetaTitulo(e.nome),
    descricao: c.etiquetaDescricao(e.nome, e.artigos.length),
    caminho: rotas.en.etiqueta(slug),
    alt: { en: rotas.en.etiqueta(slug) },
    // Um tema com um só texto serve ao leitor, mas é uma página fina para o Google.
    fino: e.artigos.length < MIN_INDEXAVEL,
  });
}

export default async function Pagina({ params }: Props) {
  const slug = (await params).etiqueta;
  if (!etiqueta('en', slug)) notFound();
  return <PaginaEtiqueta lang="en" slug={slug} />;
}
