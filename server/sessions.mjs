// ─────────────────────────────────────────────────────────────────────
// Quem está a falar connosco: o código por email, e a sessão.
//
// Não há palavras-passe. Entrar é pedir um código de seis algarismos,
// que vai para o email, e devolvê-lo. Quem controla a caixa de correio
// é quem entra — é o segundo factor a fazer de primeiro, e é o que se
// quer para marcar uma reunião sem criar mais uma conta no mundo.
//
// A sessão é uma assinatura, não uma tabela: o cookie leva o email, o
// prazo e um HMAC dos dois. O segredo tem de sobreviver a reinícios,
// senão um deploy deitava toda a gente fora — vem da configuração ou é
// gerado uma vez e guardado ao lado dos dados.
// ─────────────────────────────────────────────────────────────────────
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createHmac, randomBytes, randomInt, timingSafeEqual } from 'node:crypto';
import { join } from 'node:path';
import { AUTH, DATA_DIR, LIMITS, SITE_ORIGIN } from './config.mjs';

let secret = null;

/** Os códigos à espera de resposta, por email. Poucos, e morrem depressa. */
const codes = new Map();
const MAX_CODES = 5000;

async function loadSecret() {
  if (AUTH.secret.length >= 16) return Buffer.from(AUTH.secret, 'utf8');
  const file = join(DATA_DIR, '.session-secret');
  try {
    const saved = (await readFile(file, 'utf8')).trim();
    if (saved.length >= 32) return Buffer.from(saved, 'hex');
  } catch (_) {
    /* ainda não existe */
  }
  const fresh = randomBytes(32);
  await mkdir(DATA_DIR, { recursive: true });
  await writeFile(file, fresh.toString('hex'), { mode: 0o600 });
  console.log('[sessoes] segredo novo gerado em ' + file);
  return fresh;
}

export async function initSessions() {
  secret = await loadSecret();
}

const hmac = (value) => createHmac('sha256', secret).update(value).digest('base64url');
const same = (a, b) => {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
};

// ── O código ─────────────────────────────────────────────────────────

/** Gera um código para este email e guarda só a impressão dele. */
export function issueCode(email) {
  const code = String(randomInt(0, 1000000)).padStart(6, '0');
  codes.set(email, { hash: hmac('code.' + email + '.' + code), exp: Date.now() + AUTH.codeTtl, tries: 0 });
  if (codes.size > MAX_CODES) codes.delete(codes.keys().next().value);
  return code;
}

/** Confere o código. Cada um vale uma vez, e poucas tentativas. */
export function verifyCode(email, code) {
  const row = codes.get(email);
  if (!row) return false;
  if (row.exp < Date.now() || row.tries >= LIMITS.authTries) {
    codes.delete(email);
    return false;
  }
  row.tries += 1;
  if (!same(row.hash, hmac('code.' + email + '.' + code))) return false;
  codes.delete(email);
  return true;
}

setInterval(() => {
  const t = Date.now();
  for (const [k, row] of codes) if (row.exp < t) codes.delete(k);
}, 60e3).unref();

// ── A sessão ─────────────────────────────────────────────────────────

const encode = (email) => Buffer.from(email, 'utf8').toString('base64url');

export function sessionCookie(email) {
  const exp = String(Date.now() + AUTH.sessionTtl);
  const body = encode(email) + '.' + exp;
  return cookie(body + '.' + hmac('session.' + body), AUTH.sessionTtl / 1000);
}

export const clearCookie = () => cookie('', 0);

function cookie(value, maxAge) {
  return (
    AUTH.cookie + '=' + value + '; Path=/api; HttpOnly; SameSite=Lax; Max-Age=' + Math.round(maxAge) +
    (SITE_ORIGIN.startsWith('https:') ? '; Secure' : '')
  );
}

/** O email de quem faz o pedido, ou null. */
export function readSession(req) {
  if (!secret) return null;
  const raw = String(req.headers.cookie || '');
  const m = raw.match(new RegExp('(?:^|;\\s*)' + AUTH.cookie + '=([A-Za-z0-9_.-]{1,400})'));
  if (!m) return null;
  const parts = m[1].split('.');
  if (parts.length !== 3) return null;
  if (!same(parts[2], hmac('session.' + parts[0] + '.' + parts[1]))) return null;
  if (!/^\d{10,16}$/.test(parts[1]) || Number(parts[1]) < Date.now()) return null;
  try {
    const email = Buffer.from(parts[0], 'base64url').toString('utf8');
    return email && email.length <= 160 ? email : null;
  } catch (_) {
    return null;
  }
}
