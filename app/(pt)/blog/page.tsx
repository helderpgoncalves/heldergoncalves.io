import { PaginaBlog } from '@/components/PaginaBlog';
import { copy, rotas } from '@/lib/copy';
import { meta } from '@/lib/seo';

export const metadata = meta({
  lang: 'pt',
  titulo: copy.pt.blog.titulo,
  descricao: copy.pt.blog.descricao,
  caminho: rotas.pt.blog,
  alt: { pt: rotas.pt.blog, en: rotas.en.blog },
});

export default function Pagina() {
  return <PaginaBlog lang="pt" />;
}
