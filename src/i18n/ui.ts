// ─────────────────────────────────────────────────────────────
// Todo o texto do site, nos dois idiomas. Uma chave por frase.
// Editar aqui muda a página PT (/) e a EN (/en/) ao mesmo tempo.
// ─────────────────────────────────────────────────────────────
import type { Lang } from '../siteConfig';

export const ui = {
  pt: {
    'meta.title': 'Hélder Gonçalves — Engenheiro de software e IA',
    'meta.description':
      'Engenheiro de software em Barcelos, Portugal. Construo produtos e ferramentas com modelos de linguagem, agentes de IA e automação — de servidores MCP a bots de produto. TypeScript, Python e coisas que vão para produção.',
    'meta.keywords':
      'engenheiro de software, developer, inteligência artificial, agentes de IA, LLM, MCP, Model Context Protocol, Claude Code, automação, TypeScript, Python, Portugal, Barcelos, freelancer',
    'meta.og.alt': 'Hélder Gonçalves — engenheiro de software e IA',

    'nav.work': 'Trabalho',
    'nav.writing': 'Escrita',
    'nav.about': 'Sobre',
    'nav.contact': 'Contacto',
    'nav.skip': 'Saltar para o conteúdo',
    'nav.menu': 'Menu',

    'hero.role': 'Engenheiro de software',
    'hero.available': 'Disponível para projetos',
    'hero.unavailable': 'Sem disponibilidade',
    'hero.title': 'Construo software com modelos de linguagem lá dentro.',
    'hero.intro':
      'Sou o Hélder, engenheiro em Barcelos. Trabalho na fronteira entre produto e IA: agentes, servidores MCP, automação e ferramentas para quem constrói. Gosto da parte em que a ideia passa a coisa a correr em produção.',
    'hero.cta.work': 'Ver trabalho',
    'hero.cta.contact': 'Falar comigo',
    'hero.hint': 'Carrega em ⌘K para navegar',
    'hero.hintWin': 'Carrega em Ctrl+K para navegar',

    'work.eyebrow': 'Trabalho',
    'work.title': 'Projetos selecionados',
    'work.intro':
      'Código aberto, quase tudo à volta de LLMs e automação. A lista vem do GitHub e atualiza-se sozinha a cada deploy.',
    'work.all': 'Ver tudo no GitHub',
    'work.stars': 'estrelas',
    'work.updated': 'Atualizado',

    'stack.eyebrow': 'Ferramentas',
    'stack.title': 'O que uso todos os dias',
    'stack.intro':
      'A escolha segue o problema. Estas são as peças a que volto sempre.',

    'writing.eyebrow': 'Escrita',
    'writing.title': 'Notas',
    'writing.intro':
      'Textos curtos sobre engenharia, IA e o que ando a construir. Sem calendário — só quando há algo que vale a pena.',
    'writing.all': 'Ver todas as notas',
    'writing.empty': 'Ainda não há notas publicadas. Em breve.',
    'writing.readingTime': 'min de leitura',
    'writing.back': 'Voltar às notas',
    'writing.published': 'Publicado a',
    'writing.updated': 'Atualizado a',
    'writing.index.title': 'Notas',
    'writing.index.description':
      'Textos sobre engenharia de software, inteligência artificial, agentes e automação — por Hélder Gonçalves.',

    'about.eyebrow': 'Sobre',
    'about.title': 'Um pouco de contexto',
    'about.p1':
      'Sou engenheiro de software e passo os dias entre código e modelos de linguagem. Na Bitsapiens trabalho em sistemas que juntam pessoas, dados e IA para melhorar decisão e execução.',
    'about.p2':
      'Fora disso, construo ferramentas próprias: um servidor MCP que lê a app Stocks do macOS, uma ponte para pilotar o Claude Code a partir de um computador de bicicleta Garmin, um bot que transforma conversa de comunidade em backlog de produto. Publico quase tudo em código aberto.',
    'about.p3':
      'Acredito em entregas pequenas e frequentes, em protótipos cedo e em escrever o que aprendo. Se tiveres um problema difícil e concreto, fala comigo.',
    'about.based': 'Baseado em',
    'about.company': 'Atualmente',

    'contact.eyebrow': 'Contacto',
    'contact.title': 'Vamos falar',
    'contact.intro':
      'Manda-me o contexto do problema. Respondo com franqueza se faz sentido e quando poderia começar.',
    'contact.email': 'Enviar email',

    'footer.rights': 'Todos os direitos reservados',
    'footer.built': 'Feito com Astro. Sem trackers.',
    'footer.lang': 'English',

    'palette.placeholder': 'Procurar ou navegar…',
    'palette.nav': 'Navegação',
    'palette.projects': 'Projetos',
    'palette.posts': 'Notas',
    'palette.actions': 'Ações',
    'palette.empty': 'Sem resultados.',
    'palette.theme': 'Mudar tema (claro / escuro)',
    'palette.lang': 'Ler em inglês',
    'palette.copyEmail': 'Copiar email',
    'palette.copied': 'Email copiado',
    'palette.close': 'Fechar',
    'palette.open': 'Abrir pesquisa',

    'theme.toggle': 'Mudar tema',
    '404.title': 'Página não encontrada',
    '404.text': 'O link pode estar errado ou a página já não existe.',
    '404.home': 'Voltar ao início',
  },

  en: {
    'meta.title': 'Hélder Gonçalves — Software & AI engineer',
    'meta.description':
      'Software engineer based in Barcelos, Portugal. I build products and tools around language models, AI agents and automation — from MCP servers to product bots. TypeScript, Python, and things that ship.',
    'meta.keywords':
      'software engineer, developer, artificial intelligence, AI agents, LLM, MCP, Model Context Protocol, Claude Code, automation, TypeScript, Python, Portugal, freelance engineer',
    'meta.og.alt': 'Hélder Gonçalves — software and AI engineer',

    'nav.work': 'Work',
    'nav.writing': 'Writing',
    'nav.about': 'About',
    'nav.contact': 'Contact',
    'nav.skip': 'Skip to content',
    'nav.menu': 'Menu',

    'hero.role': 'Software engineer',
    'hero.available': 'Available for projects',
    'hero.unavailable': 'Not available',
    'hero.title': 'I build software with language models inside it.',
    'hero.intro':
      "I'm Hélder, an engineer based in Barcelos, Portugal. I work where product meets AI: agents, MCP servers, automation and tools for people who build. My favourite part is when an idea turns into something running in production.",
    'hero.cta.work': 'See work',
    'hero.cta.contact': 'Get in touch',
    'hero.hint': 'Press ⌘K to navigate',
    'hero.hintWin': 'Press Ctrl+K to navigate',

    'work.eyebrow': 'Work',
    'work.title': 'Selected projects',
    'work.intro':
      'Open source, mostly around LLMs and automation. The list comes straight from GitHub and refreshes on every deploy.',
    'work.all': 'See everything on GitHub',
    'work.stars': 'stars',
    'work.updated': 'Updated',

    'stack.eyebrow': 'Toolbox',
    'stack.title': 'What I use every day',
    'stack.intro': 'The stack follows the problem. These are the pieces I keep coming back to.',

    'writing.eyebrow': 'Writing',
    'writing.title': 'Notes',
    'writing.intro':
      "Short pieces on engineering, AI and whatever I'm building. No schedule — only when there's something worth writing down.",
    'writing.all': 'See all notes',
    'writing.empty': 'No notes published yet. Soon.',
    'writing.readingTime': 'min read',
    'writing.back': 'Back to notes',
    'writing.published': 'Published on',
    'writing.updated': 'Updated on',
    'writing.index.title': 'Notes',
    'writing.index.description':
      'Writing on software engineering, artificial intelligence, agents and automation — by Hélder Gonçalves.',

    'about.eyebrow': 'About',
    'about.title': 'A bit of context',
    'about.p1':
      'I am a software engineer and I spend my days between code and language models. At Bitsapiens I work on systems that connect people, data and AI to improve decisions and execution.',
    'about.p2':
      'On the side I build my own tools: an MCP server that reads the macOS Stocks app, a bridge to steer Claude Code from a Garmin cycling computer, a bot that turns community chat into a product backlog. Almost all of it is open source.',
    'about.p3':
      'I believe in small frequent deliveries, early prototypes and writing down what I learn. If you have a hard, concrete problem, get in touch.',
    'about.based': 'Based in',
    'about.company': 'Currently',

    'contact.eyebrow': 'Contact',
    'contact.title': "Let's talk",
    'contact.intro':
      "Send me the context of the problem. I'll tell you honestly whether it makes sense and when I could start.",
    'contact.email': 'Send an email',

    'footer.rights': 'All rights reserved',
    'footer.built': 'Built with Astro. No trackers.',
    'footer.lang': 'Português',

    'palette.placeholder': 'Search or jump to…',
    'palette.nav': 'Navigation',
    'palette.projects': 'Projects',
    'palette.posts': 'Notes',
    'palette.actions': 'Actions',
    'palette.empty': 'No results.',
    'palette.theme': 'Toggle theme (light / dark)',
    'palette.lang': 'Read in Portuguese',
    'palette.copyEmail': 'Copy email',
    'palette.copied': 'Email copied',
    'palette.close': 'Close',
    'palette.open': 'Open search',

    'theme.toggle': 'Toggle theme',
    '404.title': 'Page not found',
    '404.text': 'The link may be wrong, or the page no longer exists.',
    '404.home': 'Back home',
  },
} as const;

export type UIKey = keyof (typeof ui)['pt'];

export function useT(lang: Lang) {
  return function t(key: UIKey): string {
    return (ui[lang] as Record<string, string>)[key] ?? (ui.pt as Record<string, string>)[key] ?? key;
  };
}

// Datas por idioma, sempre com o mesmo formato em todo o site.
export function formatDate(date: Date, lang: Lang): string {
  return date.toLocaleDateString(lang === 'pt' ? 'pt-PT' : 'en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}
