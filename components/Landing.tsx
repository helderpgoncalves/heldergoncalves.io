import Link from 'next/link';
import { FraseViva } from './FraseViva';
import { Json } from './Json';
import { copy, htmlLang, rotas, type Lang } from '@/lib/copy';
import { SITE } from '@/lib/site';

const LARGURAS = [1280, 2048, 3072, 4096];
const srcset = (ext: string) => LARGURAS.map((w) => `/img/hero-${w}.${ext} ${w}w`).join(', ');
const IMAGEM: [number, number] = [4096, 2731];

export function Landing({ lang }: { lang: Lang }) {
  const c = copy[lang];
  const outra: Lang = lang === 'pt' ? 'en' : 'pt';

  const dados = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Person',
        '@id': `${SITE.canonico}/#eu`,
        name: SITE.nome,
        url: SITE.canonico,
        image: `${SITE.canonico}/og.jpg`,
        email: `mailto:${SITE.email}`,
        sameAs: [SITE.github, SITE.alias],
        knowsAbout: ['Software engineering', 'Artificial intelligence'],
      },
      {
        '@type': 'WebSite',
        '@id': `${SITE.canonico}/#site`,
        url: SITE.canonico,
        name: SITE.nome,
        alternateName: ['helder.si', 'heldergoncalves.io'],
        inLanguage: ['pt-PT', 'en'],
        publisher: { '@id': `${SITE.canonico}/#eu` },
      },
    ],
  };

  return (
    <main className="relative h-svh min-h-[34rem] w-full overflow-hidden bg-noite">
      <Json dados={dados} />

      <div className="absolute inset-0">
        {/* <picture> em vez de next/image: as imagens já saem optimizadas (AVIF 4:4:4, WebP, JPEG) de scripts/imagens.mjs. */}
        <picture>
          <source type="image/avif" srcSet={srcset('avif')} sizes="100vw" />
          <source type="image/webp" srcSet={srcset('webp')} sizes="100vw" />
          <img
            src="/img/hero-2048.jpg"
            srcSet={srcset('jpg')}
            sizes="100vw"
            width={IMAGEM[0]}
            height={IMAGEM[1]}
            alt={c.imagem}
            fetchPriority="high"
            decoding="async"
            className="absolute inset-0 h-full w-full object-cover object-[46%_64%]"
          />
        </picture>
      </div>

      {/* Só um pouco de sombra no topo e no fundo, para o texto respirar. */}
      <div aria-hidden className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_bottom,#0a1224a6,#0a122440_30%,transparent_48%,transparent_66%,#070a14b3)]" />

      <header className="absolute inset-x-0 top-0 flex items-center justify-between p-6 text-[0.8rem] tracking-[0.02em] sm:p-10">
        <span className="font-medium">{c.nome}</span>
        <nav aria-label="Principal" className="flex items-center gap-6 font-mono">
          <Link href={rotas[lang].blog} className="text-nevoa/80 transition-colors hover:text-nevoa focus-visible:text-nevoa focus-visible:outline-none">{c.navBlog}</Link>
          <Link
            href={rotas[outra].inicio}
            hrefLang={htmlLang[outra]}
            lang={htmlLang[outra]}
            aria-label={c.trocarRotulo}
            className="text-nevoa/60 transition-colors hover:text-nevoa focus-visible:text-nevoa focus-visible:outline-none"
          >
            {c.trocar}
          </Link>
        </nav>
      </header>

      <h1 className="pointer-events-none absolute top-[15svh] left-6 font-serif text-[clamp(2.5rem,6.9vw,7.2rem)] leading-[0.97] tracking-[-0.025em] sm:left-10 lg:left-[7vw]">
        <FraseViva frases={c.frases} />
      </h1>

      <footer className="absolute inset-x-0 bottom-0 flex flex-col gap-5 p-6 sm:flex-row sm:items-end sm:justify-between sm:p-10">
        <p className="flex flex-col gap-1.5 text-[0.8rem]">
          <span className="font-mono text-[0.68rem] tracking-[0.18em] text-nevoa/55 uppercase">{c.contacto}</span>
          <a
            href={`mailto:${SITE.email}`}
            className="w-fit text-base underline decoration-nevoa/30 underline-offset-[6px] transition-colors hover:decoration-nevoa focus-visible:decoration-nevoa focus-visible:outline-none sm:text-lg"
          >
            {SITE.email}
          </a>
        </p>
        <p className="font-mono text-[0.72rem] text-nevoa/55">helder.si · heldergoncalves.io</p>
      </footer>
    </main>
  );
}
