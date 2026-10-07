import Link from 'next/link';
import { copy, rotas, type Lang } from '@/lib/copy';
import { slugEtiqueta, type Artigo } from '@/lib/blog';

const diaMes = (iso: string) => `${iso.slice(8)}.${iso.slice(5, 7)}`;

// O índice do blog: um ano de cada vez, uma linha por texto. Data e tempo em mono, título em serifa.
export function ListaArtigos({ lang, lista }: { lang: Lang; lista: Artigo[] }) {
  const c = copy[lang].blog;
  const anos = [...new Set(lista.map((a) => a.data.slice(0, 4)))];
  return (
    <div className="mt-14 space-y-14">
      {anos.map((ano) => (
        <section key={ano} aria-label={ano}>
          <h2 className="font-mono text-[0.74rem] tracking-[0.18em] text-suave">{ano}</h2>
          <ol className="mt-4">
            {lista.filter((a) => a.data.startsWith(ano)).map((a) => (
              <li key={a.slug} className="border-t border-linha last:border-b">
                <Link href={rotas[lang].artigo(a.slug)} className="group block py-7 sm:grid sm:grid-cols-[4.5rem_1fr_auto] sm:gap-x-8 sm:py-8">
                  <p className="font-mono text-[0.76rem] leading-relaxed text-suave sm:pt-[0.55rem]">
                    <time dateTime={a.data}>{diaMes(a.data)}</time>
                    <span className="sm:hidden"> · {a.minutos} min</span>
                  </p>
                  <div className="mt-2 sm:mt-0">
                    <h3 className="font-serif text-[clamp(1.7rem,3.4vw,2.35rem)] leading-[1.08] tracking-[-0.018em] text-balance transition-colors group-hover:text-acento">
                      {a.titulo}
                      <span aria-hidden className="ml-3 inline-block translate-x-[-0.4rem] font-sans text-[0.7em] opacity-0 transition-all group-hover:translate-x-0 group-hover:opacity-100">→</span>
                    </h3>
                    <p className="mt-3 max-w-[38rem] font-leitura text-[1.06rem] leading-[1.6] text-suave text-pretty">{a.resumo}</p>
                    {(a.fonte || a.etiquetas.length > 0) && (
                      <p className="mt-4 flex flex-wrap gap-x-4 gap-y-1 font-mono text-[0.72rem] text-suave/80">
                        {a.fonte && <span className="text-acento">[{c.achado.toLowerCase()}]</span>}
                        {a.etiquetas.map((e) => <span key={slugEtiqueta(e)}>{e.toLowerCase()}</span>)}
                      </p>
                    )}
                  </div>
                  <p className="hidden font-mono text-[0.76rem] text-suave sm:block sm:pt-[0.55rem]">{a.minutos} min</p>
                </Link>
              </li>
            ))}
          </ol>
        </section>
      ))}
    </div>
  );
}
