import { ContactosBio } from '@/components/ContactosBio';
import { Json } from '@/components/Json';
import { artigos, dataLonga } from '@/lib/blog';
import { CARTOES_BIO, CONTACTOS, type Contacto } from '@/lib/bio';
import { copy, rotas } from '@/lib/copy';
import { abs } from '@/lib/seo';
import { PROJETOS, SITE } from '@/lib/site';

// Ecrã grande: o hero com as barras finas. Telemóvel: a mesma paisagem, suavizada e dez vezes mais leve (scripts/imagem-bio.mjs).
const srcset = (ext: string, prefixo = 'hero', larguras = [1280, 2048]) => larguras.map((w) => `/img/${prefixo}-${w}.${ext} ${w}w`).join(', ');
const MOVEL = '(max-width: 767px)';

// Ícones inline (sem pedidos extra): caminhos de 24×24, preenchidos com a cor do texto.
const ICONES: Record<Contacto['id'], string> = {
  linkedin: 'M4.98 3.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5zM3 9.75h4V21H3zM9.5 9.75h3.8v1.54h.05c.53-1 1.82-2.04 3.75-2.04 4 0 4.75 2.63 4.75 6.05V21h-4v-5.07c0-1.2-.02-2.76-1.7-2.76-1.7 0-1.96 1.3-1.96 2.67V21h-4z',
  whatsapp: 'M12.04 2a9.9 9.9 0 0 0-8.5 14.9L2 22l5.25-1.38A9.9 9.9 0 1 0 12.04 2zm0 1.8a8.1 8.1 0 1 1-4.13 15.07l-.3-.18-3.1.82.83-3.02-.2-.31A8.1 8.1 0 0 1 12.04 3.8zM8.6 7.5c-.2 0-.5.07-.76.35-.26.28-1 .97-1 2.37s1.02 2.75 1.16 2.94c.14.19 1.98 3.1 4.9 4.23 2.43.96 2.92.77 3.45.72.53-.05 1.7-.7 1.94-1.37.24-.67.24-1.25.17-1.37-.07-.12-.26-.19-.55-.33-.28-.15-1.7-.84-1.96-.93-.26-.1-.45-.14-.64.14-.19.29-.74.93-.9 1.12-.17.19-.33.21-.62.07-.28-.14-1.2-.44-2.28-1.4-.84-.75-1.4-1.68-1.57-1.96-.16-.29-.02-.44.12-.58.13-.13.29-.33.43-.5.14-.16.19-.28.28-.47.1-.19.05-.36-.02-.5-.07-.14-.64-1.56-.88-2.13-.23-.55-.47-.48-.64-.49z',
  email: 'M3 5h18a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1zm1.4 2 7.6 5.6L19.6 7zM4 8.6V17h16V8.6l-8 5.9z',
  github: 'M12 2a10 10 0 0 0-3.16 19.5c.5.1.68-.22.68-.48v-1.7c-2.78.6-3.37-1.34-3.37-1.34-.45-1.15-1.1-1.46-1.1-1.46-.9-.62.07-.6.07-.6 1 .07 1.53 1.03 1.53 1.03.9 1.52 2.35 1.08 2.92.83.09-.65.35-1.08.63-1.33-2.22-.25-4.55-1.11-4.55-4.94 0-1.1.39-1.98 1.03-2.68-.1-.25-.45-1.27.1-2.64 0 0 .84-.27 2.75 1.02a9.5 9.5 0 0 1 5 0c1.91-1.29 2.75-1.02 2.75-1.02.55 1.37.2 2.39.1 2.64.64.7 1.03 1.59 1.03 2.68 0 3.84-2.34 4.68-4.57 4.93.36.31.68.92.68 1.85v2.74c0 .27.18.58.69.48A10 10 0 0 0 12 2z',
  instagram: 'M7.5 2h9A5.5 5.5 0 0 1 22 7.5v9a5.5 5.5 0 0 1-5.5 5.5h-9A5.5 5.5 0 0 1 2 16.5v-9A5.5 5.5 0 0 1 7.5 2zm0 1.8A3.7 3.7 0 0 0 3.8 7.5v9a3.7 3.7 0 0 0 3.7 3.7h9a3.7 3.7 0 0 0 3.7-3.7v-9a3.7 3.7 0 0 0-3.7-3.7zM12 7a5 5 0 1 1 0 10 5 5 0 0 1 0-10zm0 1.8a3.2 3.2 0 1 0 0 6.4 3.2 3.2 0 0 0 0-6.4zm5.2-2.7a1.2 1.2 0 1 1 0 2.4 1.2 1.2 0 0 1 0-2.4z',
};

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
        sameAs: [SITE.linkedin, SITE.instagram, SITE.github, SITE.bio, SITE.alias],
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

        <ContactosBio contactos={CONTACTOS} icones={ICONES} />

        <nav aria-label="Ligações" className="mt-6 flex w-full flex-col gap-3">
          {CARTOES_BIO.map((l, i) => (
            <a
              key={l.url}
              style={{ ['--i' as string]: i + 5 }}
              href={l.url}
              {...(l.url.startsWith('http') && !l.url.startsWith(SITE.canonico) ? { target: '_blank', rel: 'noopener' } : {})}
              className={`bio-entra block min-h-14 rounded-2xl border px-5 py-3.5 text-left transition-[transform,background-color,border-color] duration-200 ease-out active:scale-[0.985] focus-visible:outline-2 focus-visible:outline-offset-2 motion-safe:hover:-translate-y-px ${l.destaque ? 'border-[#f4b36a] bg-[#f4b36a] text-noite hover:bg-[#f8c48b]' : 'border-nevoa/20 bg-noite/60 hover:border-nevoa/45 hover:bg-noite/75 sm:backdrop-blur-md'}`}
            >
              {l.destaque && <span className="mb-1 block font-mono text-[0.66rem] tracking-[0.16em] text-noite/70 uppercase">Novo</span>}
              <span className="block text-[1.02rem] font-medium">{l.rotulo}</span>
              <span className={`mt-0.5 block text-[0.8rem] ${l.destaque ? 'text-noite/70' : 'text-nevoa/70'}`}>{l.nota}</span>
            </a>
          ))}
        </nav>

        {recentes.length > 0 && (
          <section aria-labelledby="recentes" style={{ ['--i' as string]: CARTOES_BIO.length + 5 }} className="bio-entra mt-10 w-full text-left">
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
          <a href={abs(rotas.pt.feed)} className="py-2 hover:text-nevoa">RSS</a>
          <a href={SITE.canonico} className="py-2 hover:text-nevoa">heldergoncalves.io</a>
        </footer>
      </div>
    </main>
  );
}
