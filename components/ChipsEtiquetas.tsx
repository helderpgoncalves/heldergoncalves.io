import Link from 'next/link';
import { copy, rotas, type Lang } from '@/lib/copy';
import { MIN_INDEXAVEL, etiquetas } from '@/lib/blog';

// Os temas do blog como uma linha de texto em mono. Só entram os que têm 2 ou mais textos
// (com um só, a página de tema não valia a pena).
export function ChipsEtiquetas({ lang, atual }: { lang: Lang; atual?: string }) {
  const c = copy[lang].blog;
  const lista = etiquetas(lang).filter((e) => e.artigos.length >= MIN_INDEXAVEL || e.slug === atual);
  if (lista.length === 0) return null;
  const base = 'underline-offset-[6px] transition-colors hover:text-tinta';
  const ativo = 'text-tinta underline decoration-acento decoration-2';
  const inativo = 'text-suave';
  return (
    <nav aria-label={c.etiquetas} className="mt-10 flex flex-wrap gap-x-6 gap-y-2 font-mono text-[0.78rem]">
      <Link href={rotas[lang].blog} prefetch={false} aria-current={atual ? undefined : 'page'} className={`${base} ${atual ? inativo : ativo}`}>{lang === 'pt' ? 'tudo' : 'all'}</Link>
      {lista.map((e) => (
        <Link key={e.slug} href={rotas[lang].etiqueta(e.slug)} prefetch={false} aria-current={atual === e.slug ? 'page' : undefined} className={`${base} ${atual === e.slug ? ativo : inativo}`}>
          {e.nome.toLowerCase()} <span className="opacity-50">{e.artigos.length}</span>
        </Link>
      ))}
    </nav>
  );
}
