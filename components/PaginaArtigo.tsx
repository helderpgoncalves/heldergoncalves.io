import Link from 'next/link';
import { Cabecalho } from './Cabecalho';
import { Rodape } from './Rodape';
import { FormSubscrever } from './FormSubscrever';
import { Json } from './Json';
import { copy, htmlLang, rotas } from '@/lib/copy';
import { artigos, dataLonga, html, traducao, type Artigo } from '@/lib/escritos';
import { abs } from '@/lib/seo';
import { SITE } from '@/lib/site';

export function PaginaArtigo({ a }: { a: Artigo }) {
  const lang = a.lang;
  const c = copy[lang];
  const outra = traducao(a);
  const alt = outra ? rotas[outra.lang].artigo(outra.slug) : rotas[lang === 'pt' ? 'en' : 'pt'].escritos;

  // Seguinte e anterior, para não deixar o leitor num beco.
  const todos = artigos(lang);
  const i = todos.findIndex((x) => x.slug === a.slug);
  const seguinte = todos[i + 1];

  const url = abs(rotas[lang].artigo(a.slug));
  const dados = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'BlogPosting',
        '@id': `${url}#artigo`,
        headline: a.titulo,
        description: a.resumo,
        datePublished: a.data,
        dateModified: a.data,
        inLanguage: htmlLang[lang],
        url,
        mainEntityOfPage: url,
        image: abs('/og.jpg'),
        keywords: a.etiquetas.join(', '),
        wordCount: a.md.split(/\s+/).filter(Boolean).length,
        author: { '@type': 'Person', name: SITE.nome, url: SITE.canonico },
        publisher: { '@type': 'Person', name: SITE.nome, url: SITE.canonico },
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: SITE.nome, item: abs(rotas[lang].inicio) },
          { '@type': 'ListItem', position: 2, name: c.escritos.titulo, item: abs(rotas[lang].escritos) },
          { '@type': 'ListItem', position: 3, name: a.titulo, item: url },
        ],
      },
    ],
  };

  return (
    <div className="papel">
      <Json dados={dados} />
      <Cabecalho lang={lang} alt={alt} />
      <main className="mx-auto w-full max-w-[44rem] px-6 pt-10 sm:pt-16">
        <article>
          <header>
            <p className="font-mono text-[0.78rem] text-suave">
              <Link href={rotas[lang].escritos} className="hover:text-tinta">← {c.escritos.voltar}</Link>
            </p>
            <h1 className="mt-8 font-serif text-[clamp(2.7rem,7.2vw,4.9rem)] leading-[0.98] tracking-[-0.028em] text-balance">{a.titulo}</h1>
            <p className="mt-6 font-leitura text-[clamp(1.25rem,1.8vw,1.5rem)] leading-[1.5] text-suave italic text-pretty">{a.resumo}</p>
            <p className="mt-7 flex flex-wrap items-center gap-x-5 gap-y-1 border-y border-linha py-3.5 font-mono text-[0.76rem] text-suave">
              <span>{SITE.nome}</span>
              <time dateTime={a.data}>{dataLonga(a.data, lang)}</time>
              <span>{a.minutos} {c.escritos.min}</span>
            </p>
          </header>

          <div lang={htmlLang[lang]} className="leitura mt-12" dangerouslySetInnerHTML={{ __html: html(a) }} />

          <footer className="mt-14 space-y-5 border-t border-linha pt-8 font-mono text-[0.78rem] text-suave">
            {a.fonte && (
              <p>
                {c.escritos.fonteLabel}: <a className="underline decoration-linha underline-offset-4 hover:text-tinta" href={a.fonte.url} target="_blank" rel="noopener noreferrer">{a.fonte.nome} ↗</a>
              </p>
            )}
            {a.etiquetas.length > 0 && <p className="flex flex-wrap gap-x-4 uppercase tracking-[0.06em]">{a.etiquetas.map((e) => <span key={e}>{e}</span>)}</p>}
            {outra && (
              <p>
                <Link href={rotas[outra.lang].artigo(outra.slug)} hrefLang={htmlLang[outra.lang]} className="underline decoration-linha underline-offset-4 hover:text-tinta">{c.escritos.tradLabel} →</Link>
              </p>
            )}
          </footer>
        </article>

        <section aria-label={c.form.rotulo} className="mt-14 rounded-2xl border border-linha p-7 sm:p-9">
          <FormSubscrever lang={lang} t={c.form} />
        </section>

        {seguinte && (
          <nav aria-label="Seguinte" className="mt-10">
            <Link href={rotas[lang].artigo(seguinte.slug)} className="group block border-t border-linha pt-6">
              <span className="font-mono text-[0.72rem] tracking-[0.14em] text-suave uppercase">{lang === 'pt' ? 'Antes deste' : 'Before this one'}</span>
              <span className="mt-2 block font-serif text-[1.9rem] leading-tight tracking-[-0.015em] transition-colors group-hover:text-acento">{seguinte.titulo}</span>
            </Link>
          </nav>
        )}
      </main>
      <Rodape lang={lang} />
    </div>
  );
}
