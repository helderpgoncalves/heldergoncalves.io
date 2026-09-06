// ─────────────────────────────────────────────────────────────
// Tudo o que muda com frequência está aqui: identidade, links e
// os dois textos da página (português e inglês).
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
};

export type Lang = 'pt' | 'en';

export const COPY = {
  pt: {
    htmlLang: 'pt-PT',
    title: 'Hélder Gonçalves — Engenheiro de software e IA',
    description:
      'Engenheiro de software em Barcelos, Portugal. Construo produtos e ferramentas com modelos de linguagem, agentes e automação. Contacto: helder@heldergoncalves.io',
    keywords:
      'engenheiro de software, developer, inteligência artificial, agentes de IA, LLM, MCP, automação, TypeScript, Python, Portugal, Barcelos',
    role: 'Engenheiro de software',
    place: 'Barcelos, Portugal',
    intro:
      'Sou o Hélder. Construo software — e, cada vez mais, software com modelos de linguagem lá dentro: agentes, servidores MCP e automação que poupa trabalho a quem o faz.',
    intro2:
      'De dia trabalho na Bitsapiens, em sistemas que ligam pessoas, dados e IA. De noite ando pelos meus projetos: um servidor MCP que lê a app Stocks do macOS, uma ponte para pilotar o Claude Code a partir de um Garmin, um bot que transforma conversa de comunidade em backlog. Quase tudo em código aberto.',
    intro3:
      'Prefiro entregas pequenas e frequentes a planos grandes. Se tens um problema difícil e concreto, escreve-me.',
    contactTitle: 'Contacto',
    contactLead: 'A forma mais rápida é o email. Respondo a tudo o que tenha contexto.',
    labels: { email: 'Email', github: 'GitHub', linkedin: 'LinkedIn', twitter: 'X', where: 'Onde' },
    switch: 'English',
    switchHref: '/en/',
    footer: 'Feito com Astro. Sem cookies, sem trackers.',
  },
  en: {
    htmlLang: 'en',
    title: 'Hélder Gonçalves — Software & AI engineer',
    description:
      'Software engineer based in Barcelos, Portugal. I build products and tools around language models, agents and automation. Contact: helder@heldergoncalves.io',
    keywords:
      'software engineer, developer, artificial intelligence, AI agents, LLM, MCP, automation, TypeScript, Python, Portugal',
    role: 'Software engineer',
    place: 'Barcelos, Portugal',
    intro:
      "I'm Hélder. I build software — and, more and more, software with language models inside it: agents, MCP servers, and automation that saves real people real work.",
    intro2:
      'By day I work at Bitsapiens on systems that connect people, data and AI. The rest of the time I build my own things: an MCP server that reads the macOS Stocks app, a bridge to steer Claude Code from a Garmin bike computer, a bot that turns community chat into a product backlog. Almost all of it open source.',
    intro3:
      'I prefer small frequent deliveries to big plans. If you have a hard, concrete problem, drop me a line.',
    contactTitle: 'Contact',
    contactLead: 'Email is the fastest way. I answer anything that comes with context.',
    labels: { email: 'Email', github: 'GitHub', linkedin: 'LinkedIn', twitter: 'X', where: 'Where' },
    switch: 'Português',
    switchHref: '/',
    footer: 'Built with Astro. No cookies, no trackers.',
  },
} as const;
