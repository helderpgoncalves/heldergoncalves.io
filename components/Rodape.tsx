import { copy, rotas, type Lang } from '@/lib/copy';
import { PROJETOS, SITE } from '@/lib/site';

export function Rodape({ lang }: { lang: Lang }) {
  const c = copy[lang];
  return (
    <footer className="mx-auto mt-24 w-full max-w-[64rem] border-t border-linha px-6 py-10 text-[0.85rem] text-suave sm:px-10">
      <div className="flex flex-col gap-8 sm:flex-row sm:justify-between">
        {PROJETOS.length > 0 && <div>
          <p className="font-mono text-[0.7rem] tracking-[0.14em] uppercase">{lang === 'pt' ? 'Projetos' : 'Projects'}</p>
          <ul className="mt-3 space-y-2">
            {PROJETOS.map((p) => (
              <li key={p.url}>
                <a className="text-tinta underline decoration-linha underline-offset-4 hover:decoration-suave" href={p.url} target="_blank" rel="noopener">{p.nome}</a>
                <span className="block max-w-[26rem] text-[0.8rem]">{p.descricao[lang]}</span>
              </li>
            ))}
          </ul>
        </div>}
        <div className="sm:text-right sm:ml-auto">
          <p className="font-mono text-[0.7rem] tracking-[0.14em] uppercase">{lang === 'pt' ? 'Fala comigo' : 'Elsewhere'}</p>
          <p className="mt-3 flex gap-5 font-mono sm:justify-end">
            <a className="hover:text-tinta" href={SITE.instagram} rel="me noopener noreferrer" target="_blank">Instagram</a>
            <a className="hover:text-tinta" href={SITE.github} rel="me noopener noreferrer" target="_blank">GitHub</a>
            <a className="hover:text-tinta" href={SITE.bio}>Bio</a>
            <a className="hover:text-tinta" href={rotas[lang].feed}>{c.blog.feed}</a>
          </p>
        </div>
      </div>
      <p className="mt-10">
        © {new Date().getFullYear()} <a className="hover:text-tinta" href={SITE.canonico} rel="author">{c.nome}</a> · <a className="underline decoration-linha underline-offset-4 hover:text-tinta" href={`mailto:${SITE.email}`}>{SITE.email}</a>
      </p>
    </footer>
  );
}
