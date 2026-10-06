import Link from 'next/link';
import { copy, htmlLang, rotas, type Lang } from '@/lib/copy';

// Cabeçalho das páginas de leitura. `alt` é o caminho da mesma página na outra língua.
export function Cabecalho({ lang, alt }: { lang: Lang; alt: string }) {
  const c = copy[lang];
  const outra: Lang = lang === 'pt' ? 'en' : 'pt';
  return (
    <header className="mx-auto flex w-full max-w-[64rem] items-center justify-between px-6 py-6 text-[0.85rem] sm:px-10 sm:py-8">
      <Link href={rotas[lang].inicio} className="font-medium tracking-[0.01em] transition-opacity hover:opacity-70">{c.nome}</Link>
      <nav aria-label="Principal" className="flex items-center gap-6 font-mono">
        <Link href={rotas[lang].escritos} className="text-suave transition-colors hover:text-tinta">{c.navEscritos}</Link>
        <Link href={alt} hrefLang={htmlLang[outra]} lang={htmlLang[outra]} aria-label={c.trocarRotulo} className="text-suave transition-colors hover:text-tinta">{c.trocar}</Link>
      </nav>
    </header>
  );
}
