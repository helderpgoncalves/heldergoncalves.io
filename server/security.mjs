// ─────────────────────────────────────────────────────────────────────
// O que protege o servidor: cabeçalhos, limites por visitante e o
// token que prova que um formulário esteve mesmo aberto.
//
// O segredo é gerado a cada arranque, de propósito: reiniciar invalida
// os tokens antigos. O único segredo que tem de sobreviver a reinícios
// é o da newsletter, e esse tem casa própria em subscribers.mjs.
// ─────────────────────────────────────────────────────────────────────
import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { LIMITS, TRUST_PROXY } from './config.mjs';

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

/** Vão em todas as respostas, sem excepção. */
export const SECURITY = {
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

const SECRET = randomBytes(32);
const usedTokens = new Map();
const hits = new Map();
const now = () => Date.now();

// Um mapa de contagens sem tecto é uma fuga de memória à espera de um
// ataque distribuído: cada endereço novo é uma chave nova, e a limpeza
// só passa de cinco em cinco minutos. Com tecto, o pior caso é conhecido
// — e quem é deitado fora primeiro é quem há mais tempo não aparece, que
// é exactamente quem já não estava a ser limitado.
const MAX_KEYS = 20_000;

function evictOldest(map, keep) {
  for (const key of map.keys()) {
    if (map.size <= keep) break;
    map.delete(key);
  }
}

/**
 * Conta uma ocorrência e diz se ainda cabe dentro do limite.
 * Janela deslizante: guarda os instantes e deita fora os que já saíram.
 */
export function bump(key, window, max) {
  const t = now();
  const list = (hits.get(key) || []).filter((x) => t - x < window);
  if (list.length >= max) {
    hits.set(key, list);
    return false;
  }
  list.push(t);
  hits.delete(key);
  hits.set(key, list);
  if (hits.size > MAX_KEYS) evictOldest(hits, MAX_KEYS);
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
export const ipKey = (req) => createHmac('sha256', SECRET).update(clientIp(req)).digest('hex').slice(0, 24);

/** O pedido vem mesmo do nosso site, e traz JSON? */
export function wrongOrigin(req, siteOrigin) {
  const origin = req.headers.origin;
  if (origin && origin !== siteOrigin) return 'origem';
  if (String(req.headers['content-type'] || '').indexOf('application/json') === -1) return 'formato';
  return null;
}

// ── Token do formulário ──────────────────────────────────────────────
// Prova três coisas ao mesmo tempo: que o formulário foi aberto neste
// servidor, que foi aberto por este visitante, e há quanto tempo. Um
// robô que faça POST directo não tem nenhuma delas.
export function issueToken(fingerprint) {
  const stamp = String(now());
  const nonce = randomBytes(9).toString('base64url');
  const sig = createHmac('sha256', SECRET).update(stamp + '.' + nonce + '.' + fingerprint).digest('base64url');
  return stamp + '.' + nonce + '.' + sig;
}

export function checkToken(token, fingerprint, opts) {
  const minAge = opts && opts.minAge != null ? opts.minAge : LIMITS.tokenMinAge;
  const singleUse = !opts || opts.singleUse !== false;
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
  if (age < minAge) return 'rapido';
  if (age > LIMITS.tokenMaxAge) return 'expirado';
  if (singleUse) {
    if (usedTokens.has(token)) return 'repetido';
    usedTokens.set(token, now() + LIMITS.tokenMaxAge);
    if (usedTokens.size > MAX_KEYS) evictOldest(usedTokens, MAX_KEYS);
  }
  return null;
}
