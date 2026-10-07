import { Cabecalho } from './Cabecalho';
import { Rodape } from './Rodape';
import { FormSubscrever } from './FormSubscrever';
import { Json } from './Json';
import { ListaArtigos } from './ListaArtigos';
import { ChipsEtiquetas } from './ChipsEtiquetas';
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
    name: `${c.blog.titulo} — ${SITE.nome}`,
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
      <main className="mx-auto w-full max-w-[64rem] px-6 pt-10 sm:px-10 sm:pt-16">
        <h1 className="font-serif text-[clamp(3.4rem,10vw,7.5rem)] leading-[0.92] tracking-[-0.03em]">{c.blog.cabeca}</h1>
        <p className="mt-7 max-w-[36rem] font-leitura text-[clamp(1.2rem,1.6vw,1.45rem)] leading-[1.55] text-suave text-pretty">{c.blog.intro}</p>

        <ChipsEtiquetas lang={lang} />

        <section aria-label={c.form.rotulo} className="mt-10 border-y border-linha py-9">
          <FormSubscrever lang={lang} t={c.form} />
        </section>

        {lista.length === 0 ? <p className="mt-16 text-suave">{c.blog.vazio}</p> : <ListaArtigos lang={lang} lista={lista} />}
      </main>
      <Rodape lang={lang} />
    </div>
  );
}
