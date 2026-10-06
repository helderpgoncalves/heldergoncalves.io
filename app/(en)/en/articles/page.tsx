import { PaginaEscritos } from '@/components/PaginaEscritos';
import { copy, rotas } from '@/lib/copy';
import { meta } from '@/lib/seo';

export const metadata = meta({
  lang: 'en',
  titulo: copy.en.escritos.titulo,
  descricao: copy.en.escritos.descricao,
  caminho: rotas.en.escritos,
  alt: { pt: rotas.pt.escritos, en: rotas.en.escritos },
});

export default function Pagina() {
  return <PaginaEscritos lang="en" />;
}
