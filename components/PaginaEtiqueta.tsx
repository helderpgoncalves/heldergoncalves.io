import Link from 'next/link';
import { Cabecalho } from './Cabecalho';
import { Rodape } from './Rodape';
import { Json } from './Json';
import { ListaArtigos } from './ListaArtigos';
import { ChipsEtiquetas } from './ChipsEtiquetas';
import { copy, htmlLang, rotas, type Lang } from '@/lib/copy';
import { etiqueta } from '@/lib/blog';
import { abs } from '@/lib/seo';
import { SITE } from '@/lib/site';

export function PaginaEtiqueta({ lang, slug }: { lang: Lang; slug: string }) {
  const e = etiqueta(lang, slug);
  if (!e) return null;
  const c = copy[lang];
  const url = abs(rotas[lang].etiqueta(slug));

  const dados = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'CollectionPage',
        '@id': `${url}#pagina`,
        name: c.blog.etiquetaTitulo(e.nome),
        description: c.blog.etiquetaDescricao(e.nome, e.artigos.length),
        url,
        inLanguage: htmlLang[lang],
        isPartOf: { '@type': 'Blog', '@id': `${abs(rotas[lang].blog)}#blog` },
        mainEntity: {
          '@type': 'ItemList',
          itemListElement: e.artigos.map((a, i) => ({ '@type': 'ListItem', position: i + 1, url: abs(rotas[lang].artigo(a.slug)), name: a.titulo })),
        },
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: SITE.nome, item: abs(rotas[lang].inicio) },
          { '@type': 'ListItem', position: 2, name: c.blog.titulo, item: abs(rotas[lang].blog) },
          { '@type': 'ListItem', position: 3, name: e.nome, item: url },
        ],
      },
    ],
  };

  return (
    <div className="papel">
      <Json dados={dados} />
      <Cabecalho lang={lang} alt={lang === 'pt' ? rotas.en.blog : rotas.pt.blog} />
      <main className="mx-auto w-full max-w-[64rem] px-6 pt-10 sm:px-10 sm:pt-16">
        <p className="font-mono text-[0.78rem] text-suave">
          <Link href={rotas[lang].blog} className="hover:text-tinta">← {c.blog.voltar}</Link>
        </p>
        <p className="mt-10 font-mono text-[0.78rem] tracking-[0.14em] text-suave uppercase">{c.blog.etiquetaCabeca} · {c.blog.textos(e.artigos.length)}</p>
        <h1 className="mt-3 font-serif text-[clamp(3rem,9vw,6.5rem)] leading-[0.95] tracking-[-0.03em] text-balance">{e.nome}</h1>

        <ChipsEtiquetas lang={lang} atual={slug} />
        <ListaArtigos lang={lang} lista={e.artigos} />
      </main>
      <Rodape lang={lang} />
    </div>
  );
}
