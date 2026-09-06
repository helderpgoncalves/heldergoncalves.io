// ─────────────────────────────────────────────────────────────
// Tudo o que muda com frequência vive aqui: identidade, links e
// os textos das duas línguas (português na raiz, inglês em /en/).
// ─────────────────────────────────────────────────────────────
export const SITE = {
  url: 'https://heldergoncalves.io',
  name: 'Hélder Gonçalves',
  email: 'helder@heldergoncalves.io',
  ogImage: '/og.png',
  github: 'https://github.com/helderpgoncalves',
  linkedin: 'https://www.linkedin.com/in/heldergoncalves16/',
  twitter: 'https://x.com/heldinhoshotgun',
  twitterHandle: '@heldinhoshotgun',
  company: { name: 'Bitsapiens', url: 'https://bitsapiens.io/' },
  // Quantos escritos aparecem na página inicial.
  homePosts: 5,
};

export type Lang = 'pt' | 'en';

export const COPY = {
  pt: {
    htmlLang: 'pt-PT',
    locale: 'pt_PT',
    intlLocale: 'pt-PT',
    title: 'Hélder Gonçalves — Engenheiro de software e IA',
    description:
      'Engenheiro de software em Barcelos, Portugal. Construo produtos e ferramentas com modelos de linguagem, agentes e automação — e escrevo sobre isso.',
    keywords:
      'engenheiro de software, developer, inteligência artificial, agentes de IA, LLM, MCP, automação, TypeScript, Python, Portugal, Barcelos, blog',
    role: 'Engenheiro de software',
    place: 'Barcelos, Portugal',
    intro:
      'Sou o Hélder. Construo software — e, cada vez mais, software com modelos de linguagem lá dentro: agentes, servidores MCP e automação que poupa trabalho a quem o faz.',
    intro2:
      'De dia trabalho na Bitsapiens, em sistemas que ligam pessoas, dados e IA. De noite ando pelos meus projetos: um servidor MCP que lê a app Stocks do macOS, uma ponte para pilotar o Claude Code a partir de um Garmin, um bot que transforma conversa de comunidade em backlog. Quase tudo em código aberto.',
    intro3:
      'Prefiro entregas pequenas e frequentes a planos grandes. Aqui escrevo o que aprendo pelo caminho — sem cerimónia, sem newsletter, sem cookies.',
    nav: { home: 'Início', blog: 'Escritos', feed: 'RSS' },
    home: {
      writing: 'Escritos recentes',
      writingLead: 'Notas sobre o que construo e o que corre mal antes de correr bem.',
      all: 'Ver todos os escritos',
      empty: 'Ainda nada publicado. Está a caminho.',
      contact: 'Falar comigo',
      contactLead: 'A forma mais rápida é o email. Respondo a tudo o que tenha contexto.',
    },
    blog: {
      title: 'Escritos',
      heading: 'Escritos',
      description:
        'Notas de Hélder Gonçalves sobre engenharia de software, modelos de linguagem, agentes, MCP e automação.',
      lead: 'Notas sobre engenharia, modelos de linguagem e as ferramentas que construo. Sem calendário fixo — só quando há alguma coisa que valha a pena dizer.',
      empty: 'Ainda nada publicado. Está a caminho.',
      feed: 'Assinar por RSS',
    },
    post: {
      backToBlog: '← Todos os escritos',
      readingTime: 'min de leitura',
      updated: 'Atualizado a',
      readOther: 'Read this in English',
      tags: 'Temas',
      talk: 'Discordas ou queres continuar a conversa?',
      talkLink: 'Escreve-me.',
    },
    labels: { github: 'GitHub', linkedin: 'LinkedIn', twitter: 'X' },
    switch: 'English',
    switchHref: '/en/',
    skip: 'Saltar para o conteúdo',
    footer: 'Feito com Astro. Sem cookies, sem trackers.',
    notFound: {
      title: 'Página não encontrada',
      lead: 'Este endereço não existe — ou já não existe.',
      home: 'Ir para o início',
      blog: 'Ver os escritos',
    },
  },
  en: {
    htmlLang: 'en',
    locale: 'en_GB',
    intlLocale: 'en-GB',
    title: 'Hélder Gonçalves — Software & AI engineer',
    description:
      'Software engineer based in Barcelos, Portugal. I build products and tools around language models, agents and automation — and I write about it.',
    keywords:
      'software engineer, developer, artificial intelligence, AI agents, LLM, MCP, automation, TypeScript, Python, Portugal, blog',
    role: 'Software engineer',
    place: 'Barcelos, Portugal',
    intro:
      "I'm Hélder. I build software — and, more and more, software with language models inside it: agents, MCP servers, and automation that saves real people real work.",
    intro2:
      'By day I work at Bitsapiens on systems that connect people, data and AI. The rest of the time I build my own things: an MCP server that reads the macOS Stocks app, a bridge to steer Claude Code from a Garmin bike computer, a bot that turns community chat into a product backlog. Almost all of it open source.',
    intro3:
      'I prefer small frequent deliveries to big plans. This is where I write down what I learn along the way — no ceremony, no newsletter, no cookies.',
    nav: { home: 'Home', blog: 'Writing', feed: 'RSS' },
    home: {
      writing: 'Recent writing',
      writingLead: 'Notes on what I build, and what breaks before it works.',
      all: 'All writing',
      empty: 'Nothing published yet. Soon.',
      contact: 'Get in touch',
      contactLead: 'Email is the fastest way. I answer anything that comes with context.',
    },
    blog: {
      title: 'Writing',
      heading: 'Writing',
      description:
        'Notes by Hélder Gonçalves on software engineering, language models, agents, MCP and automation.',
      lead: 'Notes on engineering, language models and the tools I build. No schedule — only when there is something worth saying.',
      empty: 'Nothing published yet. Soon.',
      feed: 'Subscribe via RSS',
    },
    post: {
      backToBlog: '← All writing',
      readingTime: 'min read',
      updated: 'Updated on',
      readOther: 'Ler em português',
      tags: 'Topics',
      talk: 'Disagree, or want to keep the conversation going?',
      talkLink: 'Write to me.',
    },
    labels: { github: 'GitHub', linkedin: 'LinkedIn', twitter: 'X' },
    switch: 'Português',
    switchHref: '/',
    skip: 'Skip to content',
    footer: 'Built with Astro. No cookies, no trackers.',
    notFound: {
      title: 'Page not found',
      lead: 'This address does not exist — or does not exist any more.',
      home: 'Go home',
      blog: 'Read the writing',
    },
  },
} as const;

// Rotas por língua, num sítio só.
export const ROUTES = {
  pt: { home: '/', blog: '/blog/', feed: '/rss.xml' },
  en: { home: '/en/', blog: '/en/blog/', feed: '/en/rss.xml' },
} as const;

export const other = (lang: Lang): Lang => (lang === 'pt' ? 'en' : 'pt');

export function formatDate(date: Date, lang: Lang): string {
  return new Intl.DateTimeFormat(COPY[lang].intlLocale, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(date);
}

export function readingMinutes(body: string): number {
  const words = body.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
}
