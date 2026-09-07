// ─────────────────────────────────────────────────────────────────────
// As ferramentas de HTTP: responder, ler o corpo do pedido, e limpar
// tudo o que vem de fora antes de lhe tocarmos.
//
// Regra: nenhum texto vindo do visitante chega a lado nenhum sem passar
// por `clean` ou `oneLine`. É o único sítio onde isso se decide.
// ─────────────────────────────────────────────────────────────────────
import { LIMITS } from './config.mjs';
import { SECURITY } from './security.mjs';

export function send(res, status, body, headers) {
  res.writeHead(status, Object.assign({}, SECURITY, headers || {}));
  if (body && res.req && res.req.method !== 'HEAD') res.end(body);
  else res.end();
}

export const json = (res, status, obj) =>
  send(res, status, JSON.stringify(obj), {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
  });

export const html = (res, status, body) =>
  send(res, status, body, {
    'Content-Type': 'text/html; charset=utf-8',
    'Cache-Control': 'no-store',
  });

export const text = (res, status, body) =>
  send(res, status, body, { 'Content-Type': 'text/plain; charset=utf-8' });

/** Lê o corpo com um tecto: passar do tecto corta a ligação. */
export function readBody(req, cap) {
  const limit = cap || LIMITS.body;
  return new Promise((done, fail) => {
    let size = 0;
    const chunks = [];
    req.on('data', (chunk) => {
      size += chunk.length;
      if (size > limit) {
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

/** Lê o corpo e devolve o objecto JSON — ou null se não for um. */
export async function readJson(req, cap) {
  try {
    const payload = JSON.parse(await readBody(req, cap));
    return payload && typeof payload === 'object' && !Array.isArray(payload) ? payload : null;
  } catch (_) {
    return null;
  }
}

// Fora todos os caracteres de controlo, menos a mudança de linha e o tab.
const CONTROL = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;

export const clean = (value, max) =>
  typeof value === 'string' ? value.replace(CONTROL, '').trim().slice(0, max) : '';

export const oneLine = (value, max) => clean(value, max).replace(/[\r\n]+/g, ' ');

export const EMAIL_RE =
  /^[^\s@<>";,]{1,64}@[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?(\.[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)+$/i;

const ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
export const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (ch) => ESCAPES[ch]);
