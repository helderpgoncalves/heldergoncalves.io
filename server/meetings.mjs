// ─────────────────────────────────────────────────────────────────────
// As reuniões marcadas.
//
// O mesmo feitio da lista da newsletter: um NDJSON, uma linha por
// acontecimento, sempre acrescentada ao fim. O estado de cada reunião
// é o da última linha que fala dela. Lê-se tudo ao arrancar e fica um
// Map em memória.
//
// Nunca se serve a lista inteira por HTTP: cada pessoa vê as suas, e o
// que o calendário mostra aos outros é só que a hora já não está livre.
// ─────────────────────────────────────────────────────────────────────
import { appendFile, mkdir, readFile } from 'node:fs/promises';
import { randomBytes } from 'node:crypto';
import { dirname } from 'node:path';
import { MEETINGS } from './config.mjs';

const rows = new Map();

export async function initMeetings() {
  let raw = '';
  try {
    raw = await readFile(MEETINGS.file, 'utf8');
  } catch (_) {
    console.log('[reunioes] sem ficheiro ainda');
    return;
  }
  for (const line of raw.split('\n')) {
    if (!line.trim()) continue;
    try {
      const row = JSON.parse(line);
      if (row && typeof row.id === 'string') rows.set(row.id, row);
    } catch (_) {
      /* uma linha estragada não deita a lista abaixo */
    }
  }
  console.log('[reunioes] ' + bookedStarts().size + ' marcadas de ' + rows.size + ' registos');
}

async function write(row) {
  rows.set(row.id, row);
  await mkdir(dirname(MEETINGS.file), { recursive: true });
  await appendFile(MEETINGS.file, JSON.stringify(row) + '\n', 'utf8');
}

/** Os inícios ocupados — o que o calendário precisa para tirar horários. */
export function bookedStarts() {
  const out = new Set();
  for (const row of rows.values()) if (row.status === 'booked') out.add(row.start);
  return out;
}

/** As reuniões desta pessoa, futuras primeiro. */
export function listFor(email) {
  return [...rows.values()]
    .filter((r) => r.email === email && r.status === 'booked')
    .sort((a, b) => a.start.localeCompare(b.start))
    .map(({ id, start, end, title, note }) => ({ id, start, end, title, note }));
}

/** Quantas esta pessoa marcou hoje — para ninguém encher a agenda. */
export function bookedToday(email) {
  const today = new Date().toISOString().slice(0, 10);
  return [...rows.values()].filter((r) => r.email === email && r.status === 'booked' && r.at.slice(0, 10) === today).length;
}

export async function book({ email, start, end, title, note, lang }) {
  const row = {
    id: randomBytes(8).toString('base64url'),
    email,
    start,
    end,
    title,
    note,
    lang,
    status: 'booked',
    at: new Date().toISOString(),
  };
  await write(row);
  return row;
}

export async function cancel(id, email) {
  const before = rows.get(id);
  if (!before || before.email !== email || before.status !== 'booked') return null;
  const row = { ...before, status: 'cancelled', at: new Date().toISOString() };
  await write(row);
  return row;
}
