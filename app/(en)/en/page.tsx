import { Landing } from '@/components/Landing';
import { copy, rotas } from '@/lib/copy';
import { meta } from '@/lib/seo';

export const metadata = meta({
  lang: 'en',
  tituloAbsoluto: `${copy.en.nome} · ${copy.en.frases[0].linhas.join(' ')}`,
  descricao: copy.en.descricao,
  caminho: rotas.en.inicio,
  alt: { pt: rotas.pt.inicio, en: rotas.en.inicio },
});

export default function Pagina() {
  return <Landing lang="en" />;
}
