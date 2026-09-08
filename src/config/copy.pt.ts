// ─────────────────────────────────────────────────────────────────────
// Todo o texto do site em português.
//
// Uma língua, um ficheiro. As duas têm exactamente as mesmas chaves — o
// TypeScript garante-o em copy.ts, onde as duas se juntam: mudar uma
// chave só num dos lados deixa de compilar.
// ─────────────────────────────────────────────────────────────────────

import { OS_PT } from './os.pt';
import { APPS_PT } from './apps.pt';

export const PT = {
  htmlLang: 'pt-PT',
  locale: 'pt_PT',
  intlLocale: 'pt-PT',
  title: 'Hélder Gonçalves — Engenheiro de software e IA',
  description:
    'Engenheiro de software em Barcelos, Portugal. Construo produtos e ferramentas com modelos de linguagem, agentes e automação — e escrevo sobre isso. O site é um sistema operativo: no telemóvel um iPhone, no computador um Mac.',
  keywords:
    'engenheiro de software, developer, inteligência artificial, agentes de IA, LLM, MCP, automação, TypeScript, Python, Portugal, Barcelos, blog',
  role: 'Engenheiro de software',
  place: 'Barcelos, Portugal',
  skip: 'Saltar para o conteúdo',
  switch: 'English',
  footer: 'Feito com Astro, sem frameworks e sem cookies.',

  intro:
    'Sou o Hélder. Construo software — e, cada vez mais, software com modelos de linguagem lá dentro: agentes, servidores MCP e automação que poupa trabalho a quem o faz.',
  intro2:
    'De dia trabalho na Bitsapiens, em sistemas que ligam pessoas, dados e IA. De noite ando pelos meus projetos: um servidor MCP que lê a app Stocks do macOS, uma ponte para pilotar o Claude Code a partir de um Garmin, um bot que transforma conversa de comunidade em backlog. Quase tudo em código aberto.',
  intro3:
    'Prefiro entregas pequenas e frequentes a planos grandes. Aqui escrevo o que aprendo pelo caminho — sem cerimónia, sem newsletter, sem cookies.',

  // ── O sistema ───────────────────────────────────────────
  os: OS_PT,

  // ── Aplicações ──────────────────────────────────────────
  ...APPS_PT,

  notFound: {
    title: 'Página não encontrada',
    lead: 'Este endereço não existe — ou já não existe.',
    home: 'Ir para o início',
    blog: 'Ver os escritos',
    code: 'Erro 404',
    dialog: 'A aplicação não pode ser aberta porque o ficheiro não foi encontrado.',
    ok: 'OK',
  },

  labels: { github: 'GitHub', linkedin: 'LinkedIn', twitter: 'X', email: 'Email', rss: 'RSS' },
};
