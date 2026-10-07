import { Landing } from '@/components/Landing';
import { copy, rotas } from '@/lib/copy';
import { meta } from '@/lib/seo';

export const metadata = meta({
  lang: 'pt',
  tituloAbsoluto: `${copy.pt.nome} · ${copy.pt.frases[0].linhas.join(' ')}`,
  descricao: copy.pt.descricao,
  caminho: rotas.pt.inicio,
  alt: { pt: rotas.pt.inicio, en: rotas.en.inicio },
});

export default function Pagina() {
  return <Landing lang="pt" />;
}
