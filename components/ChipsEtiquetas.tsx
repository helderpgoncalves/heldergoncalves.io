import Link from 'next/link';
import { copy, rotas, type Lang } from '@/lib/copy';
import { MIN_INDEXAVEL, etiquetas } from '@/lib/blog';

// Os temas do blog, como atalhos. Só entram os que têm pelo menos 2 textos: com um só, a página de tema não valia a pena.
export function ChipsEtiquetas({ lang, atual }: { lang: Lang; atual?: string }) {
  const c = copy[lang].blog;
  const lista = etiquetas(lang).filter((e) => e.artigos.length >= MIN_INDEXAVEL || e.slug === atual);
  if (lista.length === 0) return null;
  const chip = 'rounded-full border px-3.5 py-1.5 transition-colors';
  return (
    <nav aria-label={c.etiquetas} className="mt-9 flex flex-wrap gap-2 font-mono text-[0.76rem]">
      <Link href={rotas[lang].blog} aria-current={atual ? undefined : 'page'} className={`${chip} ${atual ? 'border-linha text-suave hover:border-suave hover:text-tinta' : 'border-tinta bg-tinta text-fundo'}`}>
        {lang === 'pt' ? 'Tudo' : 'All'}
      </Link>
      {lista.map((e) => (
        <Link
          key={e.slug}
          href={rotas[lang].etiqueta(e.slug)}
          aria-current={atual === e.slug ? 'page' : undefined}
          className={`${chip} ${atual === e.slug ? 'border-tinta bg-tinta text-fundo' : 'border-linha text-suave hover:border-suave hover:text-tinta'}`}
        >
          {e.nome} <span className="opacity-60">{e.artigos.length}</span>
        </Link>
      ))}
    </nav>
  );
}
