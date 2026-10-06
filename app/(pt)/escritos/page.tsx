import { PaginaEscritos } from '@/components/PaginaEscritos';
import { copy, rotas } from '@/lib/copy';
import { meta } from '@/lib/seo';

export const metadata = meta({
  lang: 'pt',
  titulo: copy.pt.escritos.titulo,
  descricao: copy.pt.escritos.descricao,
  caminho: rotas.pt.escritos,
  alt: { pt: rotas.pt.escritos, en: rotas.en.escritos },
});

export default function Pagina() {
  return <PaginaEscritos lang="pt" />;
}
