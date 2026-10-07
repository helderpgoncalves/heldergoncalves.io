import { Cabecalho } from './Cabecalho';
import { Rodape } from './Rodape';
import { FormSubscrever } from './FormSubscrever';
import { Json } from './Json';
import { ListaArtigos } from './ListaArtigos';
import { ChipsEtiquetas } from './ChipsEtiquetas';
import { AsciiBanner } from './AsciiBanner';
import { copy, htmlLang, rotas, type Lang } from '@/lib/copy';
import { artigos, imagemDe } from '@/lib/blog';
import { abs } from '@/lib/seo';
import { SITE } from '@/lib/site';

export function PaginaBlog({ lang }: { lang: Lang }) {
  const c = copy[lang];
  const lista = artigos(lang);
  const alt = lang === 'pt' ? rotas.en.blog : rotas.pt.blog;

  const dados = {
    '@context': 'https://schema.org',
    '@type': 'Blog',
    '@id': `${abs(rotas[lang].blog)}#blog`,
    name: `${c.blog.titulo} · ${SITE.nome}`,
    description: c.blog.descricao,
    url: abs(rotas[lang].blog),
    inLanguage: htmlLang[lang],
    author: { '@type': 'Person', name: SITE.nome, url: SITE.canonico },
    publisher: { '@type': 'Person', name: SITE.nome, url: SITE.canonico },
    blogPost: lista.map((a) => ({
      '@type': 'BlogPosting',
      headline: a.titulo,
      url: abs(rotas[lang].artigo(a.slug)),
      datePublished: a.data,
      ...(imagemDe(a) && { image: abs(imagemDe(a)!.grande) }),
    })),
  };

  return (
    <div className="papel">
      <Json dados={dados} />
      <Cabecalho lang={lang} alt={alt} />
      <main className="mx-auto w-full max-w-[52rem] px-6 pt-12 sm:pt-20">
        <p className="font-mono text-[0.78rem] text-suave">{c.blog.prompt}<span aria-hidden className="ml-1 inline-block animate-pulse">▍</span></p>
        <h1 className="mt-5 font-serif text-[clamp(3.2rem,9vw,6rem)] leading-[0.95] tracking-[-0.03em]">{c.blog.cabeca}</h1>
        <p className="mt-6 max-w-[34rem] font-leitura text-[clamp(1.15rem,1.5vw,1.3rem)] leading-[1.6] text-suave text-pretty">{c.blog.intro}</p>

        <AsciiBanner alt={c.blog.banner} />

        <section aria-label={c.form.rotulo} className="border-t border-linha pt-8">
          <FormSubscrever lang={lang} t={c.form} />
        </section>

        <ChipsEtiquetas lang={lang} />

        {lista.length === 0 ? <p className="mt-16 font-mono text-[0.84rem] text-suave">{c.blog.vazio}</p> : <ListaArtigos lang={lang} lista={lista} />}
      </main>
      <Rodape lang={lang} />
    </div>
  );
}
