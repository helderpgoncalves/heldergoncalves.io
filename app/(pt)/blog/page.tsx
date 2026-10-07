import { PaginaBlog } from '@/components/PaginaBlog';
import { copy, rotas } from '@/lib/copy';
import { meta } from '@/lib/seo';

export const metadata = meta({
  lang: 'pt',
  titulo: copy.pt.blog.titulo,
  descricao: copy.pt.blog.descricao,
  caminho: rotas.pt.blog,
  imagem: { url: '/img/blog-og.jpg', w: 1200, h: 630, alt: copy.pt.blog.banner },
  alt: { pt: rotas.pt.blog, en: rotas.en.blog },
});

export default function Pagina() {
  return <PaginaBlog lang="pt" />;
}
