import { PaginaBlog } from '@/components/PaginaBlog';
import { copy, rotas } from '@/lib/copy';
import { meta } from '@/lib/seo';

export const metadata = meta({
  lang: 'en',
  titulo: copy.en.blog.titulo,
  descricao: copy.en.blog.descricao,
  caminho: rotas.en.blog,
  alt: { pt: rotas.pt.blog, en: rotas.en.blog },
});

export default function Pagina() {
  return <PaginaBlog lang="en" />;
}
