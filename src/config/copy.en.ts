// ─────────────────────────────────────────────────────────────────────
// Todo o texto do site em inglês.
//
// Uma língua, um ficheiro. As duas têm exactamente as mesmas chaves — o
// TypeScript garante-o em copy.ts, onde as duas se juntam: mudar uma
// chave só num dos lados deixa de compilar.
// ─────────────────────────────────────────────────────────────────────

import { OS_EN } from './os.en';
import { APPS_EN } from './apps.en';
import { EDITOR_EN } from './editor.en';

export const EN = {
  htmlLang: 'en',
  locale: 'en_GB',
  intlLocale: 'en-GB',
  title: 'Hélder Gonçalves — Software & AI engineer',
  description:
    'Software engineer based in Barcelos, Portugal. I build products and tools around language models, agents and automation — and I write about it. This site is an operating system: an iPhone on mobile, a Mac on desktop.',
  keywords:
    'software engineer, developer, artificial intelligence, AI agents, LLM, MCP, automation, TypeScript, Python, Portugal, blog',
  role: 'Software engineer',
  place: 'Barcelos, Portugal',
  skip: 'Skip to content',
  switch: 'Português',
  footer: 'Built with Astro, no frameworks and no cookies.',

  intro:
    "I'm Hélder. I build software — and, more and more, software with language models inside it: agents, MCP servers, and automation that saves real people real work.",
  intro2:
    'By day I work at Bitsapiens on systems that connect people, data and AI. The rest of the time I build my own things — mostly small bridges between tools I already use and language models, almost all of it open source.',
  intro3:
    'I prefer small frequent deliveries to big plans. This is where I write down what I learn along the way — no ceremony, no newsletter, no cookies.',

  os: OS_EN,

  ...APPS_EN,
  editor: EDITOR_EN,

  notFound: {
    title: 'Page not found',
    lead: 'This address does not exist — or does not exist any more.',
    home: 'Go home',
    blog: 'Read the writing',
    code: 'Error 404',
    dialog: 'The application cannot be opened because the file was not found.',
    ok: 'OK',
  },

  labels: { github: 'GitHub', linkedin: 'LinkedIn', twitter: 'X', email: 'Email', rss: 'RSS' },
};
