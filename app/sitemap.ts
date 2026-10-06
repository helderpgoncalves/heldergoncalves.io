import type { MetadataRoute } from 'next';
import { htmlLang, linguaPadrao, linguas, rotas, type Lang } from '@/lib/copy';
import { artigos, traducao } from '@/lib/blog';
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
  const atualizada = maisRecente(todos.map((a) => a.data));

  const porLingua = (f: (l: Lang) => string): Caminhos => Object.fromEntries(linguas.map((l) => [l, f(l)]));
  const lista: Pagina[] = [
    { caminhos: porLingua((l) => rotas[l].inicio), atualizada, imagens: [abs('/og.jpg')] },
    { caminhos: porLingua((l) => rotas[l].blog), atualizada },
  ];

  // Cada texto, agrupado com a sua tradução (se houver), sem repetir o grupo.
  const vistos = new Set<string>();
  for (const a of todos) {
    const t = traducao(a);
    const grupo: Caminhos = { [a.lang]: rotas[a.lang].artigo(a.slug), ...(t && { [t.lang]: rotas[t.lang].artigo(t.slug) }) };
    const chave = Object.values(grupo).sort().join('|');
    if (vistos.has(chave)) continue;
    vistos.add(chave);
    lista.push({ caminhos: grupo, atualizada: maisRecente([a.data, ...(t ? [t.data] : [])]) });
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
