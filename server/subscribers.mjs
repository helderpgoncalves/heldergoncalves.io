// ─────────────────────────────────────────────────────────────────────
// A lista de quem subscreveu o blog.
//
// Um ficheiro NDJSON: uma linha por acontecimento, sempre acrescentada
// ao fim, nunca reescrita. Ficar-se por acrescentar tem três vantagens
// que valem mais do que a elegância de um ficheiro pequeno: uma queda a
// meio de uma escrita não estraga o que já lá estava, o histórico de
// quem entrou e saiu fica guardado, e o ficheiro lê-se com `cat`.
//
// O estado de cada email é o da última linha que fala dele. Ao arrancar
// lê-se tudo uma vez e fica um Map em memória.
//
// A lista nunca é servida por HTTP. Não há endpoint que a devolva, nem
// sequer contando quantos são: quem a quer, lê o ficheiro no servidor.
// ─────────────────────────────────────────────────────────────────────
import { appendFile, mkdir, readFile, writeFile } from 'node:fs/promises';
import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { dirname, join } from 'node:path';
import { DATA_DIR, NEWSLETTER } from './config.mjs';

/** @typedef {'pending'|'active'|'gone'} Estado */

const people = new Map();
let secret = null;

async function ensureDir() {
  await mkdir(dirname(NEWSLETTER.file), { recursive: true });
}

/**
 * O segredo que assina as ligações de confirmação. Ao contrário do
 * segredo dos formulários, este TEM de sobreviver a reinícios: uma
 * ligação já enviada por email tem de continuar a valer amanhã. Vem da
 * configuração; se não vier, gera-se uma vez e guarda-se ao lado da
 * lista.
 */
async function loadSecret() {
  if (NEWSLETTER.secret.length >= 16) return Buffer.from(NEWSLETTER.secret, 'utf8');
  const file = join(DATA_DIR, '.subscribe-secret');
  try {
    const saved = (await readFile(file, 'utf8')).trim();
    if (saved.length >= 32) return Buffer.from(saved, 'hex');
  } catch (_) {
    /* ainda não existe */
  }
  const fresh = randomBytes(32);
  await ensureDir();
  await writeFile(file, fresh.toString('hex'), { mode: 0o600 });
  console.log('[newsletter] segredo novo gerado em ' + file);
  return fresh;
}

async function loadPeople() {
  let raw = '';
  try {
    raw = await readFile(NEWSLETTER.file, 'utf8');
  } catch (_) {
    return;
  }
  for (const line of raw.split('\n')) {
    if (!line.trim()) continue;
    try {
      const row = JSON.parse(line);
      if (row && typeof row.email === 'string') people.set(row.email, row);
    } catch (_) {
      /* uma linha estragada não deita a lista abaixo */
    }
  }
}

export async function initSubscribers() {
  secret = await loadSecret();
  await loadPeople();
  const active = [...people.values()].filter((p) => p.status === 'active').length;
  console.log('[newsletter] ' + active + ' subscrições activas de ' + people.size + ' registos');
}

async function write(row) {
  people.set(row.email, row);
  await ensureDir();
  await appendFile(NEWSLETTER.file, JSON.stringify(row) + '\n', 'utf8');
}

export const normalize = (email) => String(email).trim().toLowerCase();

export const statusOf = (email) => {
  const row = people.get(normalize(email));
  return row ? row.status : null;
};

/**
 * Regista uma intenção de subscrever. Ainda não vale nada: só passa a
 * valer quando a pessoa carregar na ligação que lhe é enviada.
 */
export async function markPending(email, lang) {
  const key = normalize(email);
  const before = people.get(key);
  await write({
    email: key,
    lang: lang === 'en' ? 'en' : 'pt',
    status: 'pending',
    at: new Date().toISOString(),
    since: (before && before.since) || new Date().toISOString(),
  });
}

export async function markActive(email) {
  const key = normalize(email);
  const before = people.get(key);
  if (!before) return false;
  await write({
    ...before,
    status: 'active',
    at: new Date().toISOString(),
    confirmedAt: new Date().toISOString(),
  });
  return true;
}

export async function markGone(email) {
  const key = normalize(email);
  const before = people.get(key);
  if (!before) return false;
  await write({ ...before, status: 'gone', at: new Date().toISOString() });
  return true;
}

// ── As ligações assinadas ────────────────────────────────────────────
// Uma ligação leva o email, o instante e uma assinatura dos dois. Não
// há nada guardado do lado do servidor à espera dela: se a assinatura
// bate certo e não expirou, é boa. Isso quer dizer que reiniciar o
// servidor não invalida nada, e que não há tabela de tokens a crescer.

const sign = (kind, email, stamp) =>
  createHmac('sha256', secret).update(kind + '.' + email + '.' + stamp).digest('base64url');

/** @param {'confirm'|'unsubscribe'} kind */
export function linkFor(origin, kind, email) {
  const key = normalize(email);
  const stamp = String(Date.now());
  const query = new URLSearchParams({
    e: Buffer.from(key, 'utf8').toString('base64url'),
    t: stamp,
    s: sign(kind, key, stamp),
  });
  return origin + '/api/subscribe/' + kind + '?' + query.toString();
}

/**
 * Confere a ligação e devolve o email — ou null.
 * O cancelamento não expira: uma pessoa tem de poder sair de uma lista
 * a partir de um email de há dois anos.
 * @param {'confirm'|'unsubscribe'} kind
 */
export function readLink(kind, params) {
  if (!secret) return null;
  const raw = params.get('e') || '';
  const stamp = params.get('t') || '';
  const given = params.get('s') || '';
  if (raw.length > 300 || given.length > 100 || !/^\d{10,16}$/.test(stamp)) return null;

  let email;
  try {
    email = Buffer.from(raw, 'base64url').toString('utf8');
  } catch (_) {
    return null;
  }
  if (!email || email.length > 160) return null;

  const a = Buffer.from(given);
  const b = Buffer.from(sign(kind, email, stamp));
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

  if (kind === 'confirm' && Date.now() - Number(stamp) > NEWSLETTER.confirmWindow) return null;
  return email;
}
