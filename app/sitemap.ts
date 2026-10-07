import type { MetadataRoute } from 'next';
import { htmlLang, linguaPadrao, linguas, rotas, type Lang } from '@/lib/copy';
import { MIN_INDEXAVEL, artigos, etiquetas, imagemDe, modificado, traducao } from '@/lib/blog';
import { abs } from '@/lib/seo';

// Uma "página" é o mesmo conteúdo em várias línguas. Cada língua dá um <url>, e todos
// listam todas as versões (incluindo a si próprio) e o x-default: é o que o Google exige
// para o hreflang ser válido. Acrescentar uma língua a `linguas` basta para a incluir aqui.
type Caminhos = Partial<Record<Lang, string>>;
type Pagina = { caminhos: Caminhos; atualizada?: string; imagens?: string[] };

const maisRecente = (datas: string[]) => datas.toSorted().at(-1);

function paginas(): Pagina[] {
  const todos = linguas.flatMap((l) => artigos(l));
  // Só há data de modificação a sério quando há texto novo: nada de "hoje" a cada build.
  const atualizada = maisRecente(todos.map(modificado));

  const porLingua = (f: (l: Lang) => string): Caminhos => Object.fromEntries(linguas.map((l) => [l, f(l)]));
  const lista: Pagina[] = [
    { caminhos: porLingua((l) => rotas[l].inicio), atualizada, imagens: [abs('/og.jpg')] },
    { caminhos: porLingua((l) => rotas[l].blog), atualizada },
  ];

  // Páginas de tema, só as que têm texto que chegue (as outras estão com noindex). O nome do tema muda
  // de língua para língua, por isso cada uma é a sua própria página, sem tradução.
  for (const l of linguas) {
    for (const e of etiquetas(l)) {
      if (e.artigos.length < MIN_INDEXAVEL) continue;
      lista.push({ caminhos: { [l]: rotas[l].etiqueta(e.slug) }, atualizada: maisRecente(e.artigos.map(modificado)) });
    }
  }

  // Cada texto, agrupado com a sua tradução (se houver), sem repetir o grupo.
  const vistos = new Set<string>();
  for (const a of todos) {
    const t = traducao(a);
    const grupo: Caminhos = { [a.lang]: rotas[a.lang].artigo(a.slug), ...(t && { [t.lang]: rotas[t.lang].artigo(t.slug) }) };
    const chave = Object.values(grupo).sort().join('|');
    if (vistos.has(chave)) continue;
    vistos.add(chave);
    const capas = [a, ...(t ? [t] : [])].map(imagemDe).filter((i) => i !== null).map((i) => abs(i.grande));
    lista.push({ caminhos: grupo, atualizada: maisRecente([modificado(a), ...(t ? [modificado(t)] : [])]), ...(capas.length && { imagens: [...new Set(capas)] }) });
  }
  return lista;
}

export default function sitemap(): MetadataRoute.Sitemap {
  return paginas().flatMap(({ caminhos, atualizada, imagens }) => {
    const presentes = linguas.filter((l) => caminhos[l]);
    const languages: Record<string, string> = Object.fromEntries(presentes.map((l) => [htmlLang[l], abs(caminhos[l]!)]));
    languages['x-default'] = abs(caminhos[linguaPadrao] ?? caminhos[presentes[0]]!);
    return presentes.map((l) => ({
      url: abs(caminhos[l]!),
      lastModified: atualizada,
      alternates: { languages },
      ...(imagens && { images: imagens }),
    }));
  });
}
