// ─────────────────────────────────────────────────────────────────────
// Todas as decisões que vêm de fora, num sítio só.
//
// Se uma variável de ambiente for lida em qualquer outro ficheiro, é um
// erro: quem quiser saber como se configura o servidor lê este ficheiro
// e mais nenhum, e quem acrescentar uma opção sabe onde a pôr.
// ─────────────────────────────────────────────────────────────────────
import { resolve } from 'node:path';

const env = (name, fallback = '') => process.env[name] || fallback;

export const PORT = Number(env('PORT', '3000'));
export const ROOT = resolve(env('STATIC_DIR', './dist'));
export const KNOWLEDGE_DIR = resolve(env('KNOWLEDGE_DIR', './knowledge'));
export const DATA_DIR = resolve(env('DATA_DIR', './data'));
export const TRUST_PROXY = process.env.TRUST_PROXY !== '0';
export const SITE_ORIGIN = env('SITE_ORIGIN', 'https://heldergoncalves.io').replace(/\/$/, '');

// ── Email ────────────────────────────────────────────────────────────
// Nenhuma chave chega ao browser: vive só aqui. Sem fornecedor
// configurado, o site volta ao `mailto:` e não se perde nada.
export const MAIL = {
  provider: env('MAIL_PROVIDER').toLowerCase(), // 'resend' | 'webhook' | ''
  key: env('RESEND_API_KEY'),
  webhook: env('MAIL_WEBHOOK_URL'),
  to: env('MAIL_TO', 'helder@heldergoncalves.io'),
  from: env('MAIL_FROM', 'site@heldergoncalves.io'),
};
export const mailReady =
  (MAIL.provider === 'resend' && MAIL.key.length > 10) ||
  (MAIL.provider === 'webhook' && /^https:\/\//.test(MAIL.webhook));

// ── Conversa (OpenRouter) ────────────────────────────────────────────
// O modelo por omissão é o Claude Opus 5. Para gastar menos, troca-se
// aqui por variável de ambiente — ver DEPLOY.md.
export const CHAT = {
  key: env('OPENROUTER_API_KEY'),
  model: env('OPENROUTER_MODEL', 'anthropic/claude-opus-5'),
};
export const chatReady = CHAT.key.length > 10;

// ── Marcação de conversas ────────────────────────────────────────────
// Sem nada configurado, o agente encaminha para o email — que é o que o
// Hélder faria.
export const BOOKING = {
  url: env('BOOKING_URL'),
  webhook: env('BOOKING_WEBHOOK_URL'),
};

// ── Newsletter ───────────────────────────────────────────────────────
// A lista vive num ficheiro no disco. Precisa de um volume: sem ele, a
// lista desaparece no próximo arranque — ver DEPLOY.md.
export const NEWSLETTER = {
  file: resolve(env('SUBSCRIBERS_FILE', DATA_DIR + '/subscribers.ndjson')),
  // O segredo que assina as ligações de confirmação. Tem de sobreviver a
  // reinícios, senão as ligações que já foram enviadas deixam de valer.
  secret: env('SUBSCRIBE_SECRET'),
  // Quanto tempo uma ligação de confirmação continua a valer.
  confirmWindow: 7 * 24 * 60 * 60e3,
};
export const newsletterReady = mailReady;

// ── Bolsa ────────────────────────────────────────────────────────────
// As cotações vêm do Yahoo Finance, sem chave. Quem lá vai é a API da
// Bolsa (api/, em Python), na rede interna — o servidor só a repete ao
// browser. Sem a API configurada, o servidor vai ele próprio ao gráfico
// do Yahoo: ficam as cotações e as séries, sem a ficha nem as notícias.
export const STOCKS = {
  api: env('BOLSA_API_URL').replace(/\/$/, ''),
  source: env('STOCKS_SOURCE', 'https://query1.finance.yahoo.com/v8/finance/chart/'),
  agent: 'Mozilla/5.0 (compatible; heldergoncalves.io/1.0)',
  ttl: Number(env('STOCKS_TTL_MS', '60000')),
  timeout: 8000,
  cacheMax: 400,
};
export const stocksApiReady = /^https?:\/\//.test(STOCKS.api);

// ── Sessões e reuniões ───────────────────────────────────────────────
// Entrar é um código por email — precisa do email ligado, como a
// newsletter. A agenda vale no fuso de Lisboa, seja quem for que marque.
export const AUTH = {
  secret: env('SESSION_SECRET'),
  cookie: 'hs',
  codeTtl: 10 * 60e3,
  sessionTtl: 30 * 24 * 60 * 60e3,
};
export const authReady = mailReady;

export const MEETINGS = {
  file: resolve(env('MEETINGS_FILE', DATA_DIR + '/meetings.ndjson')),
  tz: env('MEETINGS_TZ', 'Europe/Lisbon'),
  // Dias da semana (1 = segunda … 5 = sexta, 0 ou 7 = domingo) e as
  // janelas do dia em que o Hélder aceita conversas.
  days: env('MEETINGS_DAYS', '1-5'),
  windows: env('MEETINGS_WINDOWS', '10:00-12:00,15:00-18:00'),
  minutes: Number(env('MEETING_MINUTES', '30')),
  horizonDays: Number(env('MEETINGS_HORIZON_DAYS', '60')),
  noticeHours: Number(env('MEETINGS_NOTICE_HOURS', '12')),
};

// ── Limites ──────────────────────────────────────────────────────────
// Tudo o que se mede está aqui. Nenhum número mágico espalhado pelo
// código: quem quiser apertar ou alargar mexe num sítio.
export const LIMITS = {
  body: 8 * 1024,
  message: 4000,
  subject: 160,
  email: 160,

  perIp: 3,
  perIpWindow: 15 * 60e3,
  global: 40,
  globalWindow: 60 * 60e3,

  tokenPerIp: 40,
  tokenWindow: 10 * 60e3,
  tokenMinAge: 3500,
  tokenMaxAge: 45 * 60e3,

  // Subscrever é barato mas não é de graça: cada pedido manda um email.
  subPerIp: 3,
  subPerIpWindow: 60 * 60e3,
  subGlobal: 120,
  subGlobalWindow: 60 * 60e3,
  subTokenMinAge: 1200,

  // Conversa: o custo é real, por isso os limites são a sério.
  chatBody: 16 * 1024,
  chatTurn: 600,
  chatTotal: 4000,
  chatHistory: 8,
  chatOutTokens: 400,
  chatPerIp: 15,
  chatPerIpWindow: 60 * 60e3,
  chatPerIpDay: 50,
  chatDayWindow: 24 * 60 * 60e3,
  chatGlobalDay: 600,

  mcpPerIp: 60,

  // Sessões: cada pedido de código é um email; as tentativas são poucas.
  authPerIp: 5,
  authPerIpWindow: 60 * 60e3,
  authGlobal: 200,
  authGlobalWindow: 60 * 60e3,
  authVerifyPerIp: 15,
  authVerifyWindow: 15 * 60e3,
  authTries: 5,

  // Reuniões: a agenda é leve de ler, e marcar é raro.
  agendaPerIp: 120,
  agendaWindow: 10 * 60e3,
  bookPerIp: 10,
  bookWindow: 60 * 60e3,
  bookPerUserDay: 3,
  meetingNote: 1000,

  // Bolsa: cada pedido pode trazer vários títulos, e a cache faz o resto.
  stocksPerRequest: 12,
  stocksPerIp: 120,
  stocksPerIpWindow: 10 * 60e3,
  stocksGlobal: 3000,
  stocksGlobalWindow: 10 * 60e3,
  // A procura dispara a cada letra; a ficha é uma por título aberto.
  stocksSearchPerIp: 240,
  stocksSearchWindow: 10 * 60e3,
  stocksQuery: 40,
};
