import Link from 'next/link';
import { Cabecalho } from './Cabecalho';
import { Rodape } from './Rodape';
import { FormSubscrever } from './FormSubscrever';
import { Json } from './Json';
import { copy, htmlLang, rotas, type Lang } from '@/lib/copy';
import { artigos, dataLonga } from '@/lib/escritos';
import { abs } from '@/lib/seo';
import { SITE } from '@/lib/site';

export function PaginaEscritos({ lang }: { lang: Lang }) {
  const c = copy[lang];
  const lista = artigos(lang);
  const alt = lang === 'pt' ? rotas.en.escritos : rotas.pt.escritos;

  const dados = {
    '@context': 'https://schema.org',
    '@type': 'Blog',
    name: `${c.escritos.titulo} — ${SITE.nome}`,
    url: abs(rotas[lang].escritos),
    inLanguage: htmlLang[lang],
    author: { '@type': 'Person', name: SITE.nome, url: SITE.canonico },
    blogPost: lista.map((a) => ({ '@type': 'BlogPosting', headline: a.titulo, url: abs(rotas[lang].artigo(a.slug)), datePublished: a.data })),
  };

  return (
    <div className="papel">
      <Json dados={dados} />
      <Cabecalho lang={lang} alt={alt} />
      <main className="mx-auto w-full max-w-[64rem] px-6 pt-10 sm:px-10 sm:pt-16">
        <h1 className="font-serif text-[clamp(3.4rem,10vw,7.5rem)] leading-[0.92] tracking-[-0.03em]">{c.escritos.cabeca}</h1>
        <p className="mt-7 max-w-[36rem] font-leitura text-[clamp(1.2rem,1.6vw,1.45rem)] leading-[1.55] text-suave text-pretty">{c.escritos.intro}</p>

        <section aria-label={c.form.rotulo} className="mt-12 border-y border-linha py-9">
          <FormSubscrever lang={lang} t={c.form} />
        </section>

        {lista.length === 0 ? (
          <p className="mt-16 text-suave">{c.escritos.vazio}</p>
        ) : (
          <ol className="mt-4">
            {lista.map((a) => (
              <li key={a.slug} className="border-b border-linha">
                <Link href={rotas[lang].artigo(a.slug)} className="group grid gap-3 py-9 sm:grid-cols-[11rem_1fr] sm:gap-10">
                  <p className="font-mono text-[0.78rem] leading-relaxed text-suave">
                    <time dateTime={a.data}>{dataLonga(a.data, lang)}</time>
                    <br />
                    {a.minutos} {c.escritos.min}
                  </p>
                  <div>
                    <h2 className="font-serif text-[clamp(1.9rem,3.6vw,2.7rem)] leading-[1.06] tracking-[-0.02em] text-balance transition-colors group-hover:text-acento">{a.titulo}</h2>
                    <p className="mt-3 max-w-[38rem] font-leitura text-[1.12rem] leading-[1.6] text-suave text-pretty">{a.resumo}</p>
                    {a.etiquetas.length > 0 && (
                      <p className="mt-4 flex flex-wrap gap-x-4 gap-y-1 font-mono text-[0.72rem] tracking-[0.06em] text-suave/80 uppercase">
                        {a.etiquetas.map((e) => <span key={e}>{e}</span>)}
                      </p>
                    )}
                  </div>
                </Link>
              </li>
            ))}
          </ol>
        )}
      </main>
      <Rodape lang={lang} />
    </div>
  );
}
