import { copy, rotas, type Lang } from '@/lib/copy';
import { SITE } from '@/lib/site';

export function Rodape({ lang }: { lang: Lang }) {
  const c = copy[lang];
  return (
    <footer className="mx-auto mt-24 flex w-full max-w-[64rem] flex-col gap-4 border-t border-linha px-6 py-10 text-[0.85rem] text-suave sm:flex-row sm:items-center sm:justify-between sm:px-10">
      <p>
        © {new Date().getFullYear()} {c.nome} · <a className="underline decoration-linha underline-offset-4 hover:text-tinta" href={`mailto:${SITE.email}`}>{SITE.email}</a>
      </p>
      <p className="flex gap-5 font-mono">
        <a className="hover:text-tinta" href={rotas[lang].feed}>{c.escritos.feed}</a>
        <a className="hover:text-tinta" href={SITE.github} rel="me noopener noreferrer" target="_blank">GitHub</a>
      </p>
    </footer>
  );
}
