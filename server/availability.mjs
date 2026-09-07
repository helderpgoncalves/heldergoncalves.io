// ─────────────────────────────────────────────────────────────────────
// Quando o Hélder está disponível.
//
// A regra vem da configuração — que dias da semana, que janelas do dia,
// de quantos minutos é cada conversa — e vale no fuso de Lisboa, seja
// de onde for quem marca. Daqui saem os horários livres entre duas
// datas, já sem os que estão marcados, sem os que já passaram e sem os
// que estão demasiado em cima da hora.
//
// Tudo com o `Intl` do Node: sem bibliotecas de datas, como o resto.
// ─────────────────────────────────────────────────────────────────────
import { MEETINGS } from './config.mjs';

function parseDays(spec) {
  const days = new Set();
  for (const part of String(spec).split(',')) {
    const m = part.trim().match(/^([0-7])(?:-([0-7]))?$/);
    if (!m) continue;
    const a = Number(m[1]);
    const b = m[2] ? Number(m[2]) : a;
    for (let d = a; d <= b; d++) days.add(d % 7);
  }
  return days;
}

function parseWindows(spec) {
  const out = [];
  for (const part of String(spec).split(',')) {
    const m = part.trim().match(/^(\d{1,2}):(\d{2})-(\d{1,2}):(\d{2})$/);
    if (m) out.push({ from: Number(m[1]) * 60 + Number(m[2]), to: Number(m[3]) * 60 + Number(m[4]) });
  }
  return out;
}

const DAYS = parseDays(MEETINGS.days);
const WINDOWS = parseWindows(MEETINGS.windows);

const fmt = new Intl.DateTimeFormat('en-US', {
  timeZone: MEETINGS.tz,
  hourCycle: 'h23',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  weekday: 'short',
});
const WEEKDAY = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };

/** As partes de um instante, vistas de Lisboa. */
function zoned(ms) {
  const p = {};
  for (const { type, value } of fmt.formatToParts(new Date(ms))) p[type] = value;
  return {
    y: Number(p.year),
    m: Number(p.month),
    d: Number(p.day),
    h: Number(p.hour),
    min: Number(p.minute),
    wd: WEEKDAY[p.weekday],
  };
}

/** O instante UTC de uma hora de parede em Lisboa. Duas voltas chegam. */
function instantOf(y, m, d, minutes) {
  let guess = Date.UTC(y, m - 1, d, Math.floor(minutes / 60), minutes % 60);
  for (let i = 0; i < 2; i++) {
    const z = zoned(guess);
    const asUtc = Date.UTC(z.y, z.m - 1, z.d, z.h, z.min);
    guess += Date.UTC(y, m - 1, d, Math.floor(minutes / 60), minutes % 60) - asUtc;
  }
  return guess;
}

const DAY_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

/**
 * Os horários livres entre dois dias (inclusive), como instantes ISO.
 * @param {string} from  YYYY-MM-DD
 * @param {string} to    YYYY-MM-DD
 * @param {Set<string>} taken  os inícios já marcados, em ISO
 */
export function freeSlots(from, to, taken) {
  const a = from.match(DAY_RE);
  const b = to.match(DAY_RE);
  if (!a || !b) return [];
  const notBefore = Date.now() + MEETINGS.noticeHours * 3600e3;
  const horizon = Date.now() + MEETINGS.horizonDays * 86400e3;
  const out = [];
  let cursor = Date.UTC(Number(a[1]), Number(a[2]) - 1, Number(a[3]), 12);
  const last = Date.UTC(Number(b[1]), Number(b[2]) - 1, Number(b[3]), 12);
  for (let i = 0; cursor <= last && i < 70; i++, cursor += 86400e3) {
    const z = zoned(cursor);
    if (!DAYS.has(z.wd)) continue;
    for (const w of WINDOWS) {
      for (let t = w.from; t + MEETINGS.minutes <= w.to; t += MEETINGS.minutes) {
        const start = instantOf(z.y, z.m, z.d, t);
        if (start < notBefore || start > horizon) continue;
        const iso = new Date(start).toISOString();
        if (!taken.has(iso)) out.push(iso);
      }
    }
  }
  return out;
}

/** Este início é mesmo um horário nosso, e está livre? */
export function isFree(startIso, taken) {
  const ms = Date.parse(startIso);
  if (!Number.isFinite(ms)) return false;
  const day = zoned(ms);
  const key = day.y + '-' + String(day.m).padStart(2, '0') + '-' + String(day.d).padStart(2, '0');
  return freeSlots(key, key, taken).includes(new Date(ms).toISOString());
}

export const meetingEnd = (startIso) => new Date(Date.parse(startIso) + MEETINGS.minutes * 60e3).toISOString();

/** A hora, escrita para o email, no fuso de Lisboa. */
export function describe(startIso, lang) {
  return new Intl.DateTimeFormat(lang === 'en' ? 'en-GB' : 'pt-PT', {
    timeZone: MEETINGS.tz,
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZoneName: 'short',
  }).format(new Date(startIso));
}
