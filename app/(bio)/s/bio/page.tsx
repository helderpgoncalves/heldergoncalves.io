import { Json } from '@/components/Json';
import { artigos, dataLonga } from '@/lib/blog';
import { LIGACOES_BIO } from '@/lib/bio';
import { copy, rotas } from '@/lib/copy';
import { abs } from '@/lib/seo';
import { PROJETOS, SITE } from '@/lib/site';

// Ecrã grande: o hero com as barras finas. Telemóvel: a mesma paisagem, suavizada e dez vezes mais leve (scripts/imagem-bio.mjs).
const srcset = (ext: string, prefixo = 'hero', larguras = [1280, 2048]) => larguras.map((w) => `/img/${prefixo}-${w}.${ext} ${w}w`).join(', ');
const MOVEL = '(max-width: 767px)';

export default function Bio() {
  const recentes = artigos('pt').slice(0, 5);
  const c = copy.pt;

  const dados = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'ProfilePage',
        '@id': `${SITE.bio}/#pagina`,
        url: SITE.bio,
        name: `${SITE.nome} · Ligações`,
        inLanguage: 'pt-PT',
        mainEntity: { '@id': `${SITE.canonico}/#eu` },
        isPartOf: { '@id': `${SITE.canonico}/#site` },
      },
      {
        '@type': 'Person',
        '@id': `${SITE.canonico}/#eu`,
        name: SITE.nome,
        alternateName: [SITE.instagramNome, 'Helder Goncalves'],
        url: SITE.canonico,
        image: `${SITE.canonico}/og.jpg`,
        sameAs: [SITE.instagram, SITE.github, SITE.bio, SITE.alias],
      },
      ...PROJETOS.map((p) => ({ '@type': 'SoftwareApplication', name: p.nome, url: p.url, description: p.descricao.pt, applicationCategory: 'WebApplication', author: { '@id': `${SITE.canonico}/#eu` } })),
    ],
  };

  return (
    <main className="relative min-h-svh w-full overflow-x-hidden bg-noite text-nevoa">
      <Json dados={dados} />
      <div aria-hidden className="bio-fundo fixed inset-x-0 top-0 -z-0 h-lvh">
        <picture>
          <source media={MOVEL} type="image/avif" srcSet={srcset('avif', 'hero-suave', [640, 960])} sizes="100vw" />
          <source media={MOVEL} type="image/webp" srcSet={srcset('webp', 'hero-suave', [640, 960])} sizes="100vw" />
          <source type="image/avif" srcSet={srcset('avif')} sizes="100vw" />
          <source type="image/webp" srcSet={srcset('webp')} sizes="100vw" />
          <img src="/img/hero-1280.jpg" srcSet={srcset('jpg')} sizes="100vw" alt="" width={4096} height={2731} fetchPriority="high" decoding="async" className="h-full w-full object-cover object-[46%_64%]" />
        </picture>
        <div className="absolute inset-0 bg-[linear-gradient(to_bottom,#0a122480,#0a122440_38%,#070a14e0)]" />
      </div>

      <div className="relative z-10 mx-auto flex w-full max-w-[28rem] flex-col items-center px-5 pt-[max(3.5rem,env(safe-area-inset-top))] pb-[max(2.5rem,env(safe-area-inset-bottom))] text-center sm:pt-20">
        <picture className="bio-entra" style={{ ['--i' as string]: 0 }}>
          <source type="image/avif" srcSet="/img/avatar-192.avif" />
          <source type="image/webp" srcSet="/img/avatar-192.webp" />
          <img src="/icon-192.png" alt={SITE.nome} width={96} height={96} className="size-24 rounded-full border border-nevoa/25 shadow-[0_8px_30px_-8px_#0008]" />
        </picture>
        <h1 style={{ ["--i" as string]: 1 }} className="bio-entra mt-5 font-serif text-[2.6rem] leading-none tracking-[-0.02em]">{SITE.nome}</h1>
        <p style={{ ["--i" as string]: 2 }} className="bio-entra mt-3 font-serif text-[1.35rem] leading-snug text-nevoa/85 italic text-balance">{c.frases[0].linhas.join(' ')}</p>
        <p style={{ ["--i" as string]: 3 }} className="bio-entra mt-1 font-mono text-[0.72rem] text-nevoa/70">@{SITE.instagramNome}</p>

        <nav aria-label="Ligações" className="mt-8 flex w-full flex-col gap-3">
          {LIGACOES_BIO.map((l, i) => (
            <a
              key={l.url}
              style={{ ['--i' as string]: i + 4 }}
              href={l.url}
              {...(l.url.startsWith('http') && !l.url.startsWith(SITE.canonico) ? { target: '_blank', rel: 'noopener' } : {})}
              className={`bio-entra block min-h-14 rounded-2xl border px-5 py-3.5 text-left transition-[transform,background-color,border-color] duration-200 ease-out active:scale-[0.985] focus-visible:outline-2 focus-visible:outline-offset-2 motion-safe:hover:-translate-y-px ${l.destaque ? 'border-[#f4b36a] bg-[#f4b36a] text-noite hover:bg-[#f8c48b]' : 'border-nevoa/20 bg-noite/60 hover:border-nevoa/45 hover:bg-noite/75 sm:backdrop-blur-md'}`}
            >
              <span className="block text-[1.02rem] font-medium">{l.rotulo}</span>
              {l.nota && <span className={`mt-0.5 block text-[0.8rem] ${l.destaque ? 'text-noite/70' : 'text-nevoa/70'}`}>{l.nota}</span>}
            </a>
          ))}
        </nav>

        {recentes.length > 0 && (
          <section aria-labelledby="recentes" style={{ ['--i' as string]: LIGACOES_BIO.length + 4 }} className="bio-entra mt-10 w-full text-left">
            <h2 id="recentes" className="font-mono text-[0.7rem] tracking-[0.16em] text-nevoa/70 uppercase">Últimos textos</h2>
            <ul className="mt-2">
              {recentes.map((a) => (
                <li key={a.slug} className="border-b border-nevoa/15">
                  <a href={abs(rotas.pt.artigo(a.slug))} className="block py-3.5 transition-colors active:text-[#f4b36a] hover:text-[#f4b36a]">
                    <span className="block font-serif text-[1.35rem] leading-tight text-balance">{a.titulo}</span>
                    <span className="mt-1 block font-mono text-[0.7rem] text-nevoa/65">{dataLonga(a.data, 'pt')} · {a.minutos} min</span>
                  </a>
                </li>
              ))}
            </ul>
          </section>
        )}

        <footer className="mt-10 flex gap-6 font-mono text-[0.78rem] text-nevoa/70">
          <a href={SITE.instagram} rel="me noopener" target="_blank" className="py-2 hover:text-nevoa">Instagram</a>
          <a href={SITE.github} rel="me noopener" target="_blank" className="py-2 hover:text-nevoa">GitHub</a>
          <a href={abs(rotas.pt.feed)} className="py-2 hover:text-nevoa">RSS</a>
        </footer>
      </div>
    </main>
  );
}
