// ─────────────────────────────────────────────────────────────────────
// O servidor de heldergoncalves.io.
//
// Serve o que o Astro gerou e mais quatro coisas: recebe uma mensagem
// de contacto, gere as subscrições do blog, responde nas Mensagens e
// fala MCP. Zero dependências — só o Node — porque menos código de
// terceiros é menos superfície de ataque e menos coisas para atualizar
// às pressas.
//
// Este ficheiro é só o mapa. Cada rota é uma linha na tabela abaixo e
// vive num ficheiro seu em routes/; acrescentar um endpoint é escrever
// esse ficheiro e juntar uma linha. Nenhuma lógica de negócio aqui.
//
// Nenhuma chave chega ao browser: vivem todas em config.mjs, a ler
// variáveis de ambiente. Se uma faltar, a funcionalidade responde
// "indisponível" e o site continua a funcionar sem ela.
// ─────────────────────────────────────────────────────────────────────
import { createServer } from 'node:http';
import { CHAT, LIMITS, MAIL, PORT, ROOT, SITE_ORIGIN, chatReady, mailReady, newsletterReady } from './config.mjs';
import { json, send, text } from './http.mjs';
import { bump, ipKey, issueToken } from './security.mjs';
import { handleStatic } from './static.mjs';
import { warmCache } from './warm.mjs';
import { initSubscribers } from './subscribers.mjs';
import { handleContact } from './routes/contact.mjs';
import { handleConfirm, handleSubscribe, handleUnsubscribe } from './routes/subscribe.mjs';
import { handleChat } from './routes/chat.mjs';
import { describeMcp, handleMcp } from './routes/mcp.mjs';

/**
 * O token que os formulários pedem ao abrir. Diz também o que está
 * ligado, para o site saber se mostra o formulário ou o `mailto:`.
 */
function handleToken(req, res) {
  const key = ipKey(req);
  if (!bump('tok:' + key, LIMITS.tokenWindow, LIMITS.tokenPerIp)) return json(res, 429, { ok: false, error: 'limite' });
  return json(res, 200, {
    ok: true,
    enabled: mailReady,
    chat: chatReady,
    subscribe: newsletterReady,
    token: issueToken(key),
  });
}

const mcpRoute = (req, res) => (req.method === 'GET' ? describeMcp(res) : handleMcp(req, res));

/**
 * Para o healthcheck do container. Existe porque a alternativa era
 * bater na página inicial de trinta em trinta segundos — 2880 páginas
 * por dia para responder a uma pergunta de sim ou não.
 */
const health = (req, res) => text(res, 200, 'ok');

// ── A tabela ─────────────────────────────────────────────────────────
// Caminho exacto, métodos permitidos, e quem trata. Mais nada.
const ROUTES = [
  { path: '/healthz', methods: ['GET'], handler: health },
  { path: '/api/token', methods: ['GET'], handler: handleToken },
  { path: '/api/contact', methods: ['POST'], handler: handleContact },
  { path: '/api/subscribe', methods: ['POST'], handler: handleSubscribe },
  { path: '/api/subscribe/confirm', methods: ['GET'], handler: handleConfirm },
  { path: '/api/subscribe/unsubscribe', methods: ['GET'], handler: handleUnsubscribe },
  { path: '/api/chat', methods: ['POST'], handler: handleChat },
  { path: '/mcp', methods: ['GET', 'POST'], handler: mcpRoute },
];

await initSubscribers();

const server = createServer(async (req, res) => {
  try {
    if (req.method !== 'GET' && req.method !== 'HEAD' && req.method !== 'POST')
      return send(res, 405, null, { Allow: 'GET, HEAD, POST' });

    const url = new URL(req.url || '/', 'http://' + (req.headers.host || 'localhost'));
    const route = ROUTES.find((r) => r.path === url.pathname);

    if (route) {
      // HEAD serve-se como GET, sem corpo — é `send` que trata disso.
      const method = req.method === 'HEAD' ? 'GET' : req.method;
      if (!route.methods.includes(method)) return send(res, 405, null, { Allow: route.methods.join(', ') });
      return await route.handler(req, res, url);
    }

    if (url.pathname.startsWith('/api/')) return json(res, 404, { ok: false, error: 'rota' });
    if (req.method === 'POST') return send(res, 405, null, { Allow: 'GET, HEAD' });

    return await handleStatic(req, res, url);
  } catch (err) {
    console.error('[erro]', err && err.message);
    if (!res.headersSent) text(res, 500, 'Erro interno');
    else res.end();
  }
});

// Contra ligações deixadas abertas de propósito.
server.headersTimeout = 10000;
server.requestTimeout = 20000;
server.keepAliveTimeout = 5000;
server.maxHeadersCount = 60;

server.listen(PORT, '0.0.0.0', () => {
  const estado = (ligado, comoLigado, comoDesligado) => (ligado ? 'ativo (' + comoLigado + ')' : comoDesligado);
  console.log('heldergoncalves.io a servir ' + ROOT + ' na porta ' + PORT);
  console.log('origem:     ' + SITE_ORIGIN);
  console.log('contacto:   ' + estado(mailReady, MAIL.provider, 'inativo, o site usa mailto:'));
  console.log('newsletter: ' + estado(newsletterReady, MAIL.provider, 'inativa, precisa do email configurado'));
  console.log('conversa:   ' + estado(chatReady, CHAT.model, 'inativa, as Mensagens usam respostas guardadas'));
  // Depois de a porta estar aberta: quem chegar primeiro já não espera.
  warmCache();
});

const stop = () => server.close(() => process.exit(0));
process.on('SIGTERM', stop);
process.on('SIGINT', stop);
