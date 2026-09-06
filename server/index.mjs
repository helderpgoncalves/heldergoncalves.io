// ─────────────────────────────────────────────────────────────────────
// O servidor de heldergoncalves.io.
//
// Faz duas coisas e mais nenhuma: serve os ficheiros estáticos que o
// Astro gerou e recebe uma mensagem de contacto. Zero dependências —
// só o Node — porque menos código de terceiros é menos superfície de
// ataque e menos coisas para atualizar às pressas.
//
// Nenhuma chave chega ao browser. A chave do fornecedor de email vive
// só aqui, em variáveis de ambiente. Se não estiver definida, o
// endpoint responde "indisponível" e o site volta ao `mailto:` — nunca
// se perde uma mensagem.
// ─────────────────────────────────────────────────────────────────────
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { resolve, normalize, extname, sep, join } from 'node:path';
import { createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { gzipSync } from 'node:zlib';

const PORT = Number(process.env.PORT || 3000);
const ROOT = resolve(process.env.STATIC_DIR || './dist');
const TRUST_PROXY = process.env.TRUST_PROXY !== '0';
const SITE_ORIGIN = (process.env.SITE_ORIGIN || 'https://heldergoncalves.io').replace(/\/$/, '');

// ── Email ────────────────────────────────────────────────────────────
const MAIL = {
  provider: (process.env.MAIL_PROVIDER || '').toLowerCase(), // 'resend' | 'webhook' | ''
  key: process.env.RESEND_API_KEY || '',
  webhook: process.env.MAIL_WEBHOOK_URL || '',
  to: process.env.MAIL_TO || 'helder@heldergoncalves.io',
  from: process.env.MAIL_FROM || 'site@heldergoncalves.io',
};
const mailReady =
  (MAIL.provider === 'resend' && MAIL.key.length > 10) ||
  (MAIL.provider === 'webhook' && /^https:\/\//.test(MAIL.webhook));

// ── Limites ──────────────────────────────────────────────────────────
const LIMITS = {
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
};

// ── Segredo efémero: reiniciar invalida os tokens antigos ────────────
const SECRET = randomBytes(32);
const usedTokens = new Map();
const hits = new Map();

const now = () => Date.now();

function bump(key, window, max) {
  const t = now();
  const list = (hits.get(key) || []).filter((x) => t - x < window);
  if (list.length >= max) {
    hits.set(key, list);
    return false;
  }
  list.push(t);
  hits.set(key, list);
  return true;
}

setInterval(() => {
  const t = now();
  for (const [k, list] of hits) {
    const keep = list.filter((x) => t - x < LIMITS.globalWindow);
    if (keep.length) hits.set(k, keep);
    else hits.delete(k);
  }
  for (const [k, exp] of usedTokens) if (exp < t) usedTokens.delete(k);
}, 5 * 60e3).unref();

/** O IP do visitante. Só confia no cabeçalho do proxy se lho dissermos. */
function clientIp(req) {
  if (TRUST_PROXY) {
    const fwd = req.headers['x-forwarded-for'];
    if (typeof fwd === 'string' && fwd) return fwd.split(',')[0].trim().slice(0, 64);
  }
  return (req.socket.remoteAddress || 'desconhecido').slice(0, 64);
}
/** Nunca guardamos o IP em claro — só uma impressão digital. */
const ipKey = (req) => createHmac('sha256', SECRET).update(clientIp(req)).digest('hex').slice(0, 24);

// ── Token: prova de que o formulário esteve mesmo aberto ─────────────
function issueToken(fingerprint) {
  const stamp = String(now());
  const nonce = randomBytes(9).toString('base64url');
  const sig = createHmac('sha256', SECRET).update(stamp + '.' + nonce + '.' + fingerprint).digest('base64url');
  return stamp + '.' + nonce + '.' + sig;
}

function checkToken(token, fingerprint) {
  if (typeof token !== 'string' || token.length > 200) return 'token';
  const parts = token.split('.');
  if (parts.length !== 3) return 'token';
  const expected = createHmac('sha256', SECRET)
    .update(parts[0] + '.' + parts[1] + '.' + fingerprint)
    .digest('base64url');
  const a = Buffer.from(parts[2]);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return 'token';
  const age = now() - Number(parts[0]);
  if (!Number.isFinite(age) || age < 0) return 'token';
  if (age < LIMITS.tokenMinAge) return 'rapido';
  if (age > LIMITS.tokenMaxAge) return 'expirado';
  if (usedTokens.has(token)) return 'repetido';
  usedTokens.set(token, now() + LIMITS.tokenMaxAge);
  return null;
}

// ── Cabeçalhos ───────────────────────────────────────────────────────
const CSP = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'self'",
  "frame-src 'self'",
  "img-src 'self' data:",
  "style-src 'self' 'unsafe-inline'",
  "script-src 'self'",
  "connect-src 'self'",
  "font-src 'self'",
  "form-action 'self' mailto:",
  "manifest-src 'self'",
  'upgrade-insecure-requests',
].join('; ');

const SECURITY = {
  'Content-Security-Policy': CSP,
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'SAMEORIGIN',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy':
    'accelerometer=(), camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()',
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Cross-Origin-Resource-Policy': 'same-origin',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
};

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.ico': 'image/x-icon',
  '.webmanifest': 'application/manifest+json',
  '.woff2': 'font/woff2',
  '.map': 'application/json; charset=utf-8',
};
const COMPRESSIBLE = /^(text\/|application\/(json|xml|manifest))/;

function send(res, status, body, headers) {
  res.writeHead(status, Object.assign({}, SECURITY, headers || {}));
  if (body && res.req && res.req.method !== 'HEAD') res.end(body);
  else res.end();
}

const json = (res, status, obj) =>
  send(res, status, JSON.stringify(obj), {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
  });

// ── Ficheiros estáticos ──────────────────────────────────────────────
const cache = new Map();

/** Resolve o pedido para um caminho dentro de ROOT — ou null. */
function safePath(pathname) {
  let decoded;
  try {
    decoded = decodeURIComponent(pathname);
  } catch (_) {
    return null;
  }
  if (decoded.indexOf('\u0000') !== -1) return null;
  const rel = normalize(decoded).replace(/^[/\\]+/, '');
  const full = resolve(ROOT, rel);
  if (full !== ROOT && !full.startsWith(ROOT + sep)) return null;
  return full;
}

async function load(file) {
  const hit = cache.get(file);
  if (hit) return hit;
  const body = await readFile(file);
  const type = TYPES[extname(file).toLowerCase()] || 'application/octet-stream';
  const entry = {
    body,
    type,
    etag: '"' + createHash('sha1').update(body).digest('base64url').slice(0, 22) + '"',
    gzip: COMPRESSIBLE.test(type) && body.length > 1024 ? gzipSync(body, { level: 8 }) : null,
  };
  cache.set(file, entry);
  return entry;
}

function cacheControl(urlPath, type) {
  if (urlPath.startsWith('/_astro/')) return 'public, max-age=31536000, immutable';
  if (type.startsWith('text/html')) return 'public, max-age=0, must-revalidate';
  return 'public, max-age=3600';
}

async function serveFile(req, res, file, urlPath, status) {
  const code = status || 200;
  const entry = await load(file);
  const control = cacheControl(urlPath, entry.type);
  if (code === 200 && req.headers['if-none-match'] === entry.etag) {
    res.writeHead(304, Object.assign({}, SECURITY, { ETag: entry.etag, 'Cache-Control': control }));
    return res.end();
  }
  const useGzip = String(req.headers['accept-encoding'] || '').indexOf('gzip') !== -1 && !!entry.gzip;
  const body = useGzip ? entry.gzip : entry.body;
  const headers = {
    'Content-Type': entry.type,
    'Cache-Control': control,
    ETag: entry.etag,
    Vary: 'Accept-Encoding',
    'Content-Length': String(body.length),
  };
  if (useGzip) headers['Content-Encoding'] = 'gzip';
  res.writeHead(code, Object.assign({}, SECURITY, headers));
  if (req.method === 'HEAD') return res.end();
  res.end(body);
}

async function notFound(req, res) {
  try {
    return await serveFile(req, res, join(ROOT, '404.html'), '/404.html', 404);
  } catch (_) {
    return send(res, 404, 'Not found', { 'Content-Type': 'text/plain; charset=utf-8' });
  }
}

async function handleStatic(req, res, url) {
  const file = safePath(url.pathname);
  if (!file) return send(res, 400, 'Bad request', { 'Content-Type': 'text/plain; charset=utf-8' });

  let info = null;
  try {
    info = await stat(file);
  } catch (_) {
    info = null;
  }

  if (info && info.isDirectory()) {
    if (!url.pathname.endsWith('/')) return send(res, 308, null, { Location: url.pathname + '/' + url.search });
    try {
      return await serveFile(req, res, join(file, 'index.html'), url.pathname);
    } catch (_) {
      return notFound(req, res);
    }
  }
  if (info && info.isFile()) return serveFile(req, res, file, url.pathname);

  try {
    return await serveFile(req, res, file + '.html', url.pathname);
  } catch (_) {
    return notFound(req, res);
  }
}

// ── Contacto ─────────────────────────────────────────────────────────
const EMAIL_RE = /^[^\s@<>";,]{1,64}@[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?(\.[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)+$/i;
// Fora todos os caracteres de controlo, menos a mudança de linha e o tab.
const CONTROL = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;
const clean = (value, max) => (typeof value === 'string' ? value.replace(CONTROL, '').trim().slice(0, max) : '');
const oneLine = (value, max) => clean(value, max).replace(/[\r\n]+/g, ' ');

function readBody(req) {
  return new Promise((done, fail) => {
    let size = 0;
    const chunks = [];
    req.on('data', (chunk) => {
      size += chunk.length;
      if (size > LIMITS.body) {
        fail(new Error('grande'));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => done(Buffer.concat(chunks).toString('utf8')));
    req.on('error', fail);
  });
}

async function deliver(msg) {
  const text =
    'Mensagem de heldergoncalves.io\n\nDe: ' + msg.from + '\nAssunto: ' + msg.subject + '\n\n' + msg.message + '\n';

  if (MAIL.provider === 'resend') {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + MAIL.key, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: MAIL.from,
        to: [MAIL.to],
        reply_to: msg.from,
        subject: '[site] ' + msg.subject,
        text,
      }),
      signal: AbortSignal.timeout(10000),
    });
    return res.ok;
  }
  const res = await fetch(MAIL.webhook, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: msg.from,
      subject: msg.subject,
      message: msg.message,
      source: 'heldergoncalves.io',
    }),
    signal: AbortSignal.timeout(10000),
  });
  return res.ok;
}

async function handleContact(req, res) {
  if (!mailReady) return json(res, 503, { ok: false, error: 'indisponivel' });

  const origin = req.headers.origin;
  if (origin && origin !== SITE_ORIGIN) return json(res, 403, { ok: false, error: 'origem' });
  if (String(req.headers['content-type'] || '').indexOf('application/json') === -1)
    return json(res, 415, { ok: false, error: 'formato' });

  const key = ipKey(req);
  if (!bump('msg:' + key, LIMITS.perIpWindow, LIMITS.perIp)) return json(res, 429, { ok: false, error: 'limite' });
  if (!bump('msg:global', LIMITS.globalWindow, LIMITS.global)) return json(res, 429, { ok: false, error: 'limite' });

  let payload;
  try {
    payload = JSON.parse(await readBody(req));
  } catch (_) {
    return json(res, 400, { ok: false, error: 'corpo' });
  }
  if (!payload || typeof payload !== 'object') return json(res, 400, { ok: false, error: 'corpo' });

  // Armadilha: campo invisível que só um robô preenche. Responde "ok"
  // para o robô não perceber que foi apanhado — e não envia nada.
  if (clean(payload.company, 200)) return json(res, 200, { ok: true });

  const tokenError = checkToken(payload.token, key);
  if (tokenError) return json(res, 400, { ok: false, error: tokenError });

  const from = oneLine(payload.from, LIMITS.email);
  const subject = oneLine(payload.subject, LIMITS.subject) || 'Mensagem do site';
  const message = clean(payload.message, LIMITS.message);
  if (!EMAIL_RE.test(from)) return json(res, 400, { ok: false, error: 'email' });
  if (message.length < 10) return json(res, 400, { ok: false, error: 'curto' });

  try {
    const sent = await deliver({ from, subject, message });
    if (!sent) return json(res, 502, { ok: false, error: 'entrega' });
    console.log('[contacto] mensagem entregue');
    return json(res, 200, { ok: true });
  } catch (_) {
    console.error('[contacto] falha na entrega');
    return json(res, 502, { ok: false, error: 'entrega' });
  }
}

// ── Encaminhamento ───────────────────────────────────────────────────
const server = createServer(async (req, res) => {
  try {
    if (req.method !== 'GET' && req.method !== 'HEAD' && req.method !== 'POST')
      return send(res, 405, null, { Allow: 'GET, HEAD, POST' });
    const url = new URL(req.url || '/', 'http://' + (req.headers.host || 'localhost'));

    if (url.pathname === '/api/token' && req.method === 'GET') {
      const key = ipKey(req);
      if (!bump('tok:' + key, LIMITS.tokenWindow, LIMITS.tokenPerIp))
        return json(res, 429, { ok: false, error: 'limite' });
      return json(res, 200, { ok: true, enabled: mailReady, token: issueToken(key) });
    }
    if (url.pathname === '/api/contact') {
      if (req.method !== 'POST') return send(res, 405, null, { Allow: 'POST' });
      return await handleContact(req, res);
    }
    if (url.pathname.startsWith('/api/')) return json(res, 404, { ok: false, error: 'rota' });
    if (req.method === 'POST') return send(res, 405, null, { Allow: 'GET, HEAD' });

    return await handleStatic(req, res, url);
  } catch (err) {
    console.error('[erro]', err && err.message);
    if (!res.headersSent) send(res, 500, 'Erro interno', { 'Content-Type': 'text/plain; charset=utf-8' });
    else res.end();
  }
});

// Contra ligações deixadas abertas de propósito.
server.headersTimeout = 10000;
server.requestTimeout = 20000;
server.keepAliveTimeout = 5000;
server.maxHeadersCount = 60;

server.listen(PORT, '0.0.0.0', () => {
  console.log('heldergoncalves.io a servir ' + ROOT + ' na porta ' + PORT);
  console.log('contacto: ' + (mailReady ? 'ativo (' + MAIL.provider + ')' : 'inativo, o site usa mailto:'));
});

process.on('SIGTERM', () => server.close(() => process.exit(0)));
process.on('SIGINT', () => server.close(() => process.exit(0)));
