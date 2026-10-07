import Link from 'next/link';
import { Cabecalho } from './Cabecalho';
import { Rodape } from './Rodape';
import { FormSubscrever } from './FormSubscrever';
import { Json } from './Json';
import { ExtrasArtigo } from './ExtrasArtigo';
import { Partilhar } from './Partilhar';
import { Comentarios } from './Comentarios';
import { copy, htmlLang, rotas } from '@/lib/copy';
import { artigos, dataLonga, figuraHtml, html, imagemDe, indice, modificado, relacionados, serieDe, slugEtiqueta, traducao, etiqueta, MIN_INDEXAVEL, type Artigo, type Titulo } from '@/lib/blog';
import { abs } from '@/lib/seo';
import { SITE } from '@/lib/site';

const dominio = (url: string) => { try { return new URL(url).hostname.replace(/^www\./, ''); } catch { return url; } };

// O índice só vale a pena em textos com secções. Em ecrãs largos fica ao lado, a acompanhar a leitura.
function Indice({ itens, titulo, lateral }: { itens: Titulo[]; titulo: string; lateral?: boolean }) {
  const lista = (
    <ol className="space-y-2.5 font-sans text-[0.84rem] leading-snug">
      {itens.map((t) => (
        <li key={t.id} className={t.nivel === 3 ? 'pl-4' : undefined}>
          <a href={`#${t.id}`} className="block text-suave transition-colors hover:text-tinta aria-[current=true]:text-tinta aria-[current=true]:font-medium">{t.texto}</a>
        </li>
      ))}
    </ol>
  );
  if (lateral) {
    return (
      <nav aria-label={titulo} data-indice className="sticky top-10 max-h-[calc(100svh-5rem)] overflow-y-auto border-l border-linha pl-5">
        <p className="mb-4 font-mono text-[0.7rem] tracking-[0.14em] text-suave uppercase">{titulo}</p>
        {lista}
      </nav>
    );
  }
  return (
    <details className="group rounded-xl border border-linha px-5 py-4 min-[80rem]:hidden">
      <summary className="flex cursor-pointer list-none items-center justify-between font-mono text-[0.76rem] tracking-[0.12em] text-suave uppercase [&::-webkit-details-marker]:hidden">
        {titulo}
        <span aria-hidden className="transition-transform group-open:rotate-45">+</span>
      </summary>
      <nav aria-label={titulo} className="mt-4">{lista}</nav>
    </details>
  );
}

export function PaginaArtigo({ a }: { a: Artigo }) {
  const lang = a.lang;
  const c = copy[lang];
  const outra = traducao(a);
  const alt = outra ? rotas[outra.lang].artigo(outra.slug) : rotas[lang === 'pt' ? 'en' : 'pt'].blog;

  // Antes e depois, para não deixar o leitor num beco; e textos do mesmo tema.
  const todos = artigos(lang);
  const i = todos.findIndex((x) => x.slug === a.slug);
  const depois = todos[i - 1]; // a lista vai do mais recente para o mais antigo
  const antes = todos[i + 1];
  const parecidos = relacionados(a, 3);
  const serie = serieDe(a);

  const titulos = indice(a);
  const comIndice = titulos.filter((t) => t.nivel === 2).length >= 3;
  const capa = imagemDe(a);

  const url = abs(rotas[lang].artigo(a.slug));
  const mod = modificado(a);
  const imagens = capa
    ? [abs(capa.og ?? capa.grande), abs(capa.grande)].filter((u, k, l) => l.indexOf(u) === k)
    : [abs('/og.jpg')];
  const dados = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'BlogPosting',
        '@id': `${url}#artigo`,
        headline: a.titulo,
        description: a.resumo,
        datePublished: a.data,
        dateModified: mod,
        inLanguage: htmlLang[lang],
        url,
        mainEntityOfPage: { '@type': 'WebPage', '@id': url },
        image: imagens,
        thumbnailUrl: imagens[0],
        keywords: a.etiquetas.join(', '),
        ...(a.etiquetas[0] && { articleSection: a.etiquetas[0] }),
        wordCount: a.palavras,
        timeRequired: `PT${a.minutos}M`,
        isAccessibleForFree: true,
        author: { '@type': 'Person', '@id': `${SITE.canonico}/#eu`, name: SITE.nome, url: SITE.canonico, sameAs: [SITE.instagram, SITE.github] },
        publisher: { '@id': `${SITE.canonico}/#eu` },
        // Uma parte de uma série diz a que série pertence e que lugar ocupa.
        ...(serie && { isPartOf: { '@type': 'CreativeWorkSeries', name: serie.nome }, position: a.parte }),
        // Um achado cita de onde veio: o Google percebe a relação com a fonte.
        ...(a.fonte && { citation: { '@type': 'WebPage', name: a.fonte.nome, url: a.fonte.url }, isBasedOn: a.fonte.url }),
        ...(outra && { workTranslation: { '@type': 'BlogPosting', url: abs(rotas[outra.lang].artigo(outra.slug)), inLanguage: htmlLang[outra.lang] } }),
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: SITE.nome, item: abs(rotas[lang].inicio) },
          { '@type': 'ListItem', position: 2, name: c.blog.titulo, item: abs(rotas[lang].blog) },
          { '@type': 'ListItem', position: 3, name: a.titulo, item: url },
        ],
      },
    ],
  };

  return (
    <div className="papel">
      <Json dados={dados} />
      <div className="progresso" aria-hidden />
      <Cabecalho lang={lang} alt={alt} />
      <main className="mx-auto w-full max-w-[44rem] px-6 pt-10 sm:pt-16">
        <article>
          <header>
            <p className="font-mono text-[0.78rem] text-suave">
              <Link href={rotas[lang].blog} className="hover:text-tinta">← {c.blog.voltar}</Link>
            </p>
            {a.fonte && (
              <p className="mt-8 font-mono text-[0.78rem] text-acento">[{c.blog.achado.toLowerCase()}]</p>
            )}
            <h1 className={`${a.fonte ? 'mt-5' : 'mt-8'} font-serif text-[clamp(2.7rem,7.2vw,4.9rem)] leading-[0.98] tracking-[-0.028em] text-balance`}>{a.titulo}</h1>
            <p className="mt-6 font-leitura text-[clamp(1.25rem,1.8vw,1.5rem)] leading-[1.5] text-suave italic text-pretty">{a.resumo}</p>
            <p className="mt-7 flex flex-wrap items-center gap-x-5 gap-y-1 border-y border-linha py-3.5 font-mono text-[0.76rem] text-suave">
              <span>{SITE.nome}</span>
              <time dateTime={a.data}>{dataLonga(a.data, lang)}</time>
              <span>{a.minutos} {c.blog.min}</span>
              {a.atualizado && a.atualizado !== a.data && <span>{c.blog.atualizado} <time dateTime={a.atualizado}>{dataLonga(a.atualizado, lang)}</time></span>}
            </p>
          </header>

          {serie && (
            <p className="mt-6 font-mono text-[0.78rem] text-acento">
              {c.blog.serie}: {serie.nome} · {c.blog.parte} {a.parte}
            </p>
          )}

          {a.capa && (
            <div
              className="mt-10"
              dangerouslySetInnerHTML={{ __html: figuraHtml(a.capa.imagem, { alt: a.capa.alt, legenda: a.capa.legenda ?? undefined, credito: a.capa.credito ?? undefined, larga: true, ansiosa: true }) }}
            />
          )}

          {a.fonte && (
            <a
              href={a.fonte.url}
              target="_blank"
              rel="noopener noreferrer"
              className="group mt-10 block rounded-2xl border border-linha p-5 transition-colors hover:border-suave sm:p-6"
            >
              <span className="font-mono text-[0.7rem] tracking-[0.12em] text-suave uppercase">{c.blog.achadoEm}</span>
              <span className="mt-2 block font-serif text-[1.55rem] leading-tight tracking-[-0.01em] text-pretty group-hover:text-acento">{a.fonte.nome} <span aria-hidden>↗</span></span>
              <span className="mt-1.5 block font-mono text-[0.78rem] break-all text-suave">{dominio(a.fonte.url)}</span>
            </a>
          )}

          {comIndice && <div className="mt-10"><Indice itens={titulos} titulo={c.blog.indice} /></div>}

          <div className="relative mt-12">
            {comIndice && (
              <aside className="absolute top-0 left-full ml-[5.5rem] hidden h-full w-[11.5rem] min-[80rem]:block">
                <Indice itens={titulos} titulo={c.blog.indice} lateral />
              </aside>
            )}
            <div lang={htmlLang[lang]} className="leitura" dangerouslySetInnerHTML={{ __html: html(a) }} />
          </div>

          {serie && (serie.anterior || serie.seguinte) && (
            <nav aria-label={`${c.blog.serie}: ${serie.nome}`} className="mt-14 rounded-2xl border border-linha p-6 sm:p-7">
              <p className="font-mono text-[0.72rem] tracking-[0.14em] text-suave uppercase">{c.blog.serie}: {serie.nome}</p>
              <ol className="mt-3 space-y-1.5">
                {serie.partes.map((p) => (
                  <li key={p.slug} className="font-serif text-[1.2rem] leading-snug">
                    <span className="mr-2 font-mono text-[0.76rem] text-suave">{p.parte}.</span>
                    {p.slug === a.slug ? <span aria-current="page" className="text-acento">{p.titulo}</span> : <Link href={rotas[lang].artigo(p.slug)} className="underline decoration-linha underline-offset-4 hover:text-acento">{p.titulo}</Link>}
                  </li>
                ))}
              </ol>
              {serie.seguinte && (
                <Link href={rotas[lang].artigo(serie.seguinte.slug)} rel="next" className="mt-5 block font-mono text-[0.8rem] text-tinta underline decoration-linha underline-offset-4 hover:text-acento">{c.blog.serieSeguinte} →</Link>
              )}
            </nav>
          )}

          <footer className="mt-14 space-y-6 border-t border-linha pt-8 font-mono text-[0.78rem] text-suave">
            {a.etiquetas.length > 0 && (
              <p className="flex flex-wrap gap-x-4 gap-y-1 uppercase tracking-[0.06em]">
                {a.etiquetas.map((e) => {
                  const t = etiqueta(lang, slugEtiqueta(e));
                  return t && t.artigos.length >= MIN_INDEXAVEL
                    ? <Link key={e} href={rotas[lang].etiqueta(t.slug)} className="underline decoration-linha underline-offset-4 hover:text-tinta">{e}</Link>
                    : <span key={e}>{e}</span>;
                })}
              </p>
            )}
            <Partilhar url={url} titulo={a.titulo} rotulo={c.blog.partilhar} copiar={c.blog.copiarLigacao} copiado={c.blog.ligacaoCopiada} />
            {outra && (
              <p>
                <Link href={rotas[outra.lang].artigo(outra.slug)} hrefLang={htmlLang[outra.lang]} className="underline decoration-linha underline-offset-4 hover:text-tinta">{c.blog.tradLabel} →</Link>
              </p>
            )}
          </footer>
        </article>

        <section id="subscrever" aria-label={c.form.rotulo} className="mt-14 scroll-mt-8 rounded-2xl border border-linha p-7 sm:p-9">
          <FormSubscrever lang={lang} t={c.form} />
        </section>

        <Comentarios lang={lang} slug={a.slug} t={c.comentarios} />

        {parecidos.length > 0 && (
          <section aria-labelledby="relacionados" className="mt-16">
            <h2 id="relacionados" className="font-mono text-[0.72rem] tracking-[0.14em] text-suave uppercase">{c.blog.relacionados}</h2>
            <ul className="mt-2">
              {parecidos.map((p) => (
                <li key={p.slug} className="border-b border-linha">
                  <Link href={rotas[lang].artigo(p.slug)} className="group block py-5">
                    <span className="block font-serif text-[1.65rem] leading-tight tracking-[-0.015em] text-balance transition-colors group-hover:text-acento">{p.titulo}</span>
                    <span className="mt-1.5 block font-mono text-[0.72rem] text-suave">{dataLonga(p.data, lang)} · {p.minutos} {c.blog.min}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        {(antes || depois) && (
          <nav aria-label={c.blog.titulo} className="mt-10 grid gap-x-8 gap-y-6 sm:grid-cols-2">
            {antes && (
              <Link href={rotas[lang].artigo(antes.slug)} rel="prev" className="group block border-t border-linha pt-5">
                <span className="font-mono text-[0.72rem] tracking-[0.14em] text-suave uppercase">← {c.blog.antes}</span>
                <span className="mt-2 block font-serif text-[1.45rem] leading-tight tracking-[-0.015em] text-balance transition-colors group-hover:text-acento">{antes.titulo}</span>
              </Link>
            )}
            {depois && (
              <Link href={rotas[lang].artigo(depois.slug)} rel="next" className="group block border-t border-linha pt-5 sm:col-start-2 sm:text-right">
                <span className="font-mono text-[0.72rem] tracking-[0.14em] text-suave uppercase">{c.blog.depois} →</span>
                <span className="mt-2 block font-serif text-[1.45rem] leading-tight tracking-[-0.015em] text-balance transition-colors group-hover:text-acento">{depois.titulo}</span>
              </Link>
            )}
          </nav>
        )}
      </main>
      <Rodape lang={lang} />
      <ExtrasArtigo copiar={c.blog.copiarCodigo} copiado={c.blog.codigoCopiado} />
    </div>
  );
}
