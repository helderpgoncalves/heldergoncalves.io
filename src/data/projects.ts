// ─────────────────────────────────────────────────────────────
// Projetos em destaque. A ordem aqui é a ordem no site.
// `repo` liga ao GitHub: as estrelas, a linguagem e a data de
// atualização vêm de lá no build (ver src/lib/github.ts); estes
// valores servem de fallback se a API não responder.
// ─────────────────────────────────────────────────────────────
export interface Project {
  repo: string;              // owner/name no GitHub
  name: string;              // nome mostrado
  year: string;
  url: string;               // link principal
  links?: { label: string; url: string }[];
  tags: string[];
  language: string | null;
  stars: number;
  pushedAt: string;          // ISO
  pt: { tagline: string; description: string };
  en: { tagline: string; description: string };
}

export const projects: Project[] = [
  {
    repo: 'helderpgoncalves/apple-stocks-mcp',
    name: 'apple-stocks-mcp',
    year: '2026',
    url: 'https://github.com/helderpgoncalves/apple-stocks-mcp',
    links: [{ label: 'npm', url: 'https://www.npmjs.com/package/apple-stocks-mcp' }],
    tags: ['MCP', 'TypeScript', 'macOS', 'Finance'],
    language: 'TypeScript',
    stars: 2,
    pushedAt: '2026-09-03',
    pt: {
      tagline: 'Servidor MCP para a app Stocks do macOS',
      description:
        'Dá a um assistente de IA acesso à watchlist, cotações, fundamentais e gráficos intradiários que já estão no Mac. Sem API externa, sem chaves: lê o que a aplicação nativa guarda.',
    },
    en: {
      tagline: 'An MCP server for the macOS Stocks app',
      description:
        'Gives an AI assistant access to the watchlist, quotes, fundamentals and intraday charts already sitting on the Mac. No external API, no keys: it reads what the native app stores.',
    },
  },
  {
    repo: 'helderpgoncalves/feedbot',
    name: 'feedbot',
    year: '2026',
    url: 'https://github.com/helderpgoncalves/feedbot',
    links: [{ label: 'feedbot.dev', url: 'https://feedbot.dev' }],
    tags: ['Python', 'FastAPI', 'Telegram', 'MCP', 'Docker'],
    language: 'Python',
    stars: 4,
    pushedAt: '2026-05-13',
    pt: {
      tagline: 'Conversa de comunidade transformada em backlog de produto',
      description:
        'Bot de Telegram, dashboard e servidor MCP: recolhe o feedback disperso de uma comunidade, estrutura-o e entrega-o pronto a trabalhar. Multi-tenant, em Docker, código aberto.',
    },
    en: {
      tagline: 'Community chat turned into a product backlog',
      description:
        'A Telegram bot, a dashboard and an MCP server: it collects scattered community feedback, structures it and hands it over ready to work on. Multi-tenant, dockerised, open source.',
    },
  },
  {
    repo: 'helderpgoncalves/claude-edge',
    name: 'claude-edge',
    year: '2026',
    url: 'https://github.com/helderpgoncalves/claude-edge',
    tags: ['TypeScript', 'Garmin', 'Connect IQ', 'Claude Code'],
    language: 'TypeScript',
    stars: 2,
    pushedAt: '2026-07-31',
    pt: {
      tagline: 'Pilotar o Claude Code a partir de um Garmin Edge',
      description:
        'Uma aplicação Connect IQ e uma ponte em tmux que deixam ver e dirigir uma sessão de agente do computador de bicicleta. Nasceu de uma pergunta parva e acabou a funcionar.',
    },
    en: {
      tagline: 'Steering Claude Code from a Garmin Edge',
      description:
        'A Connect IQ app plus a tmux bridge that let you watch and drive an agent session from a cycling computer. It started as a silly question and ended up working.',
    },
  },
  {
    repo: 'helderpgoncalves/oraculo',
    name: 'oraculo',
    year: '2026',
    url: 'https://github.com/helderpgoncalves/oraculo',
    tags: ['AI agents', 'LLM', 'Prediction markets', 'Backtesting'],
    language: null,
    stars: 0,
    pushedAt: '2026-08-27',
    pt: {
      tagline: 'Hedge funds autónomos sobre mercados de previsão',
      description:
        'Cria-se um agente de IA, sela-se-lhe a estratégia e deixa de se poder mudar. Assente em investigação publicada sobre calibração e previsão com modelos de linguagem.',
    },
    en: {
      tagline: 'Autonomous hedge funds on prediction markets',
      description:
        'You create an AI agent, seal its strategy, and can no longer change it. Built on published research about calibration and forecasting with language models.',
    },
  },
  {
    repo: 'helderpgoncalves/inside-my-brain',
    name: 'inside-my-brain',
    year: '2026',
    url: 'https://github.com/helderpgoncalves/inside-my-brain',
    tags: ['Escrita', 'Notas'],
    language: null,
    stars: 0,
    pushedAt: '2026-08-27',
    pt: {
      tagline: 'Um manual sobre pensar melhor',
      description:
        'Notas longas sobre atenção, decisão e trabalho — escritas primeiro para mim, deixadas abertas para quem quiser ler.',
    },
    en: {
      tagline: 'A manual on thinking better',
      description:
        'Long-form notes on attention, decision-making and work — written for myself first, left open for anyone who wants to read them.',
    },
  },
];
