import Link from 'next/link';
import { copy, rotas, type Lang } from '@/lib/copy';
import { dataLonga, figuraHtml, slugEtiqueta, type Artigo } from '@/lib/blog';

const SIZES_MINIATURA = '(min-width: 1024px) 560px, (min-width: 640px) 60vw, calc(100vw - 48px)';

// A lista de textos, partilhada pelo blog e pelas páginas de tema. Cada entrada é uma só ligação
// (título, resumo e capa), com a data à esquerda em ecrãs largos.
export function ListaArtigos({ lang, lista }: { lang: Lang; lista: Artigo[] }) {
  const c = copy[lang].blog;
  return (
    <ol className="mt-4">
      {lista.map((a, i) => (
        <li key={a.slug} className="border-b border-linha">
          <Link href={rotas[lang].artigo(a.slug)} className="group grid gap-4 py-9 sm:grid-cols-[11rem_1fr] sm:gap-10">
            <p className="font-mono text-[0.78rem] leading-relaxed text-suave">
              <time dateTime={a.data}>{dataLonga(a.data, lang)}</time>
              <br />
              {a.minutos} {c.min}
              {a.fonte && <><br /><span className="mt-2 inline-block rounded-full border border-linha px-2.5 py-0.5 text-[0.68rem] tracking-[0.08em] text-acento uppercase">{c.achado}</span></>}
            </p>
            <div>
              {a.capa && (
                <div
                  className="miniatura mb-6"
                  dangerouslySetInnerHTML={{ __html: figuraHtml(a.capa.imagem, { alt: a.capa.alt, sizes: SIZES_MINIATURA, classe: 'miniatura', ansiosa: i === 0 }) }}
                />
              )}
              <h2 className="font-serif text-[clamp(1.9rem,3.6vw,2.7rem)] leading-[1.06] tracking-[-0.02em] text-balance transition-colors group-hover:text-acento">{a.titulo}</h2>
              <p className="mt-3 max-w-[38rem] font-leitura text-[1.12rem] leading-[1.6] text-suave text-pretty">{a.resumo}</p>
              {a.etiquetas.length > 0 && (
                <p className="mt-4 flex flex-wrap gap-x-4 gap-y-1 font-mono text-[0.72rem] tracking-[0.06em] text-suave/80 uppercase">
                  {a.etiquetas.map((e) => <span key={slugEtiqueta(e)}>{e}</span>)}
                </p>
              )}
            </div>
          </Link>
        </li>
      ))}
    </ol>
  );
}
