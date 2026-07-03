# heldergoncalves.io — Astro

Landing pessoal escura editorial (Instrument Serif + liquid glass + vídeo hero em crossfade), bilingue PT/EN, otimizada para SEO.

## Correr localmente

```bash
cd astro-site
npm install
npm run dev        # http://localhost:4321
```

## Build de produção

```bash
npm run build      # gera dist/ (HTML estático, pronto a servir)
npm run preview    # pré-visualizar o build
```

O output em `dist/` é **HTML estático puro** — dá para publicar em Netlify, Vercel, Cloudflare Pages ou GitHub Pages sem servidor.

## SEO — o que já vem cablado

- **HTML renderizado no servidor** (conteúdo indexável sem depender de JS).
- **`<title>` + meta description** por idioma (`src/siteConfig.ts` → `META`).
- **Open Graph + Twitter Card** completos (`src/components/SEO.astro`).
- **Canonical** absoluto por página — **incluindo os posts do blog, que apontam para o TEU domínio** (não para o Substack).
- **hreflang** PT-PT / EN / x-default (na home).
- **JSON-LD** `Person` + `WebSite` no site, `BlogPosting` em cada post.
- **Sitemap** automático (`@astrojs/sitemap` → `/sitemap-index.xml`).
- **RSS** próprio do teu domínio (`/rss.xml`).
- **robots.txt** com referência ao sitemap.
- **`site.webmanifest`** + favicon SVG + `theme-color`.
- **Core Web Vitals**: CSS inline automático, `compressHTML`, quase zero JS.
- **Acessibilidade**: `prefers-reduced-motion`, labels, `aria-*`.

## Blog — fluxo Substack → o teu domínio

Escreves **só no Substack**. No build, o site lê o feed RSS do Substack
(`src/lib/substack.ts`) e gera **uma página real por post no teu domínio**
(`heldergoncalves.io/blog/[slug]`), com o conteúdo completo, canonical para
o teu domínio, `BlogPosting`, Open Graph `article`, e entrada no RSS/sitemap.

**Resultado:** escreves num sítio (Substack), mas o SEO do conteúdo acumula
todo em `heldergoncalves.io`.

- Índice: `/blog` — lista os posts do feed (mostra estado vazio até publicares).
- Post: `/blog/[slug]` — conteúdo espelhado + link "originalmente no Substack".
- O URL do Substack vem de `src/siteConfig.ts` → `SITE.social.substack`
  (o feed é esse URL + `/feed`).

### "Automático" tem um passo: o rebuild

Um site estático apanha os posts **no momento do build**. Para os posts
novos aparecerem sozinhos depois de publicares no Substack, configura **um**
destes no host:

**Vercel** — Settings → Git → *Deploy Hooks* → cria um hook. Depois, ou:
- corres esse URL num cron externo (ex.: cron-job.org) 1×/dia, **ou**
- ligas o webhook do Substack a esse URL (se o teu plano o permitir).

**Netlify** — Site settings → Build & deploy → *Build hooks* → cria um hook.
Netlify também tem *Scheduled builds* (via plugin/função agendada) para
reconstruir 1×/dia sem configurar cron externo.

**Cloudflare Pages** — cria um *Deploy Hook* em Settings → e dispara-o via
um Cron Trigger de um Worker (ou cron externo).

**GitHub Pages** — usa um GitHub Action com `on: schedule` (cron) que corre
`npm run build` e publica; assim reconstrói no horário que definires.

Sem isto, os posts aparecem sempre que fizeres `npm run build` à mão.

### Texto completo vs. resumo

Se o Substack expuser o **texto completo** no feed, o post aparece integral
no teu site. Se só expuser resumo, o site mostra o resumo + link para o
Substack. O código aguenta os dois casos automaticamente — não precisas de
mexer em nada.

## Onde mexer

| Quero mudar…                     | Ficheiro                          |
| -------------------------------- | --------------------------------- |
| Domínio, email, redes, URL Substack | `src/siteConfig.ts` → `SITE`   |
| Título / descrição (SEO)         | `src/siteConfig.ts` → `META`      |
| Imagem de partilha (OG)          | `public/og.svg` → trocar por `public/og.jpg` e atualizar `ogImage` |
| Texto das secções                | `src/pages/index.astro`           |
| Como o feed do Substack é lido   | `src/lib/substack.ts`             |
| Estilo das páginas de blog       | `src/styles/global.css` (secção BLOG) |
| Cores / espaçamentos / estilos   | `src/styles/global.css`           |

## Imagem OG (a fazer)

Está a usar `public/og.svg` (placeholder escuro com o teu nome). Para previews sociais perfeitos, cria uma versão **1200×630 `.jpg`/`.png`**, coloca em `public/og.jpg` e muda `ogImage: '/og.jpg'` no `siteConfig.ts`.

## Projetos (a fazer)

Os dois cards em **Trabalho** usam vídeos de template e copy genérica. Substitui em `src/pages/index.astro` (secção `#work`) por projetos reais quando os tiveres.
