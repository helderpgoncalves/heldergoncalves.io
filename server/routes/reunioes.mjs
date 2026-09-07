// ─────────────────────────────────────────────────────────────────────
// As reuniões: ver quando há, marcar, desmarcar.
//
//   GET  /api/reunioes/disponibilidade?from=&to=   os horários livres, e as minhas
//   POST /api/reunioes                             marca uma
//   POST /api/reunioes/cancelar                    desmarca uma minha
//
// Tudo com sessão. Sem ela, 401 — e o calendário do lado de lá mostra
// o mês vazio e pede o email. É a regra que se quis: quem não entrou
// não vê a agenda de ninguém.
// ─────────────────────────────────────────────────────────────────────
import { LIMITS, MAIL, MEETINGS, SITE_ORIGIN, authReady } from '../config.mjs';
import { clean, json, oneLine, readJson } from '../http.mjs';
import { bump, ipKey, wrongOrigin } from '../security.mjs';
import { sendMail } from '../mail.mjs';
import { MEETING_COPY, pickLang } from '../copy.mjs';
import { readSession } from '../sessions.mjs';
import { describe, freeSlots, isFree, meetingEnd } from '../availability.mjs';
import { book, bookedStarts, bookedToday, cancel, listFor } from '../meetings.mjs';

const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;

export function handleAvailability(req, res, url) {
  if (!authReady) return json(res, 503, { ok: false, error: 'indisponivel' });
  const email = readSession(req);
  if (!email) return json(res, 401, { ok: false, error: 'sessao' });

  const key = ipKey(req);
  if (!bump('agenda:' + key, LIMITS.agendaWindow, LIMITS.agendaPerIp)) return json(res, 429, { ok: false, error: 'limite' });

  const from = String(url.searchParams.get('from') || '');
  const to = String(url.searchParams.get('to') || '');
  if (!DAY_RE.test(from) || !DAY_RE.test(to)) return json(res, 400, { ok: false, error: 'datas' });
  if (Date.parse(to) - Date.parse(from) > 62 * 86400e3) return json(res, 400, { ok: false, error: 'datas' });

  return json(res, 200, {
    ok: true,
    tz: MEETINGS.tz,
    minutes: MEETINGS.minutes,
    slots: freeSlots(from, to, bookedStarts()),
    mine: listFor(email),
  });
}

export async function handleBook(req, res) {
  if (!authReady) return json(res, 503, { ok: false, error: 'indisponivel' });
  const email = readSession(req);
  if (!email) return json(res, 401, { ok: false, error: 'sessao' });

  const bad = wrongOrigin(req, SITE_ORIGIN);
  if (bad) return json(res, bad === 'origem' ? 403 : 415, { ok: false, error: bad });

  const key = ipKey(req);
  if (!bump('marcar:' + key, LIMITS.bookWindow, LIMITS.bookPerIp)) return json(res, 429, { ok: false, error: 'limite' });
  if (bookedToday(email) >= LIMITS.bookPerUserDay) return json(res, 429, { ok: false, error: 'limite' });

  const payload = await readJson(req);
  if (!payload) return json(res, 400, { ok: false, error: 'corpo' });

  const start = oneLine(payload.start, 40);
  const title = oneLine(payload.title, LIMITS.subject) || '';
  const note = clean(payload.note, LIMITS.meetingNote);
  const lang = pickLang(payload.lang);
  if (!isFree(start, bookedStarts())) return json(res, 409, { ok: false, error: 'ocupado' });

  const iso = new Date(Date.parse(start)).toISOString();
  const row = await book({ email, start: iso, end: meetingEnd(iso), title, note, lang });
  console.log('[reunioes] reunião marcada');

  const copy = MEETING_COPY[lang];
  const when = describe(iso, lang);
  // O email ao Hélder é o que faz a reunião existir a sério; o da
  // pessoa é a confirmação. Se algum falhar, a marcação fica na mesma.
  try {
    await sendMail({ to: MAIL.to, replyTo: email, subject: copy.ownerSubject(when), text: copy.ownerBody(when, email, title, note) });
    await sendMail({ to: email, subject: copy.userSubject(when), text: copy.userBody(when, title) });
  } catch (_) {
    console.error('[reunioes] falha a enviar um dos emails');
  }
  return json(res, 200, { ok: true, meeting: { id: row.id, start: row.start, end: row.end, title, note } });
}

export async function handleCancel(req, res) {
  if (!authReady) return json(res, 503, { ok: false, error: 'indisponivel' });
  const email = readSession(req);
  if (!email) return json(res, 401, { ok: false, error: 'sessao' });
  const bad = wrongOrigin(req, SITE_ORIGIN);
  if (bad) return json(res, bad === 'origem' ? 403 : 415, { ok: false, error: bad });

  const payload = await readJson(req);
  if (!payload) return json(res, 400, { ok: false, error: 'corpo' });
  const id = oneLine(payload.id, 40);
  const row = await cancel(id, email);
  if (!row) return json(res, 404, { ok: false, error: 'reuniao' });
  console.log('[reunioes] reunião cancelada');
  const copy = MEETING_COPY[pickLang(row.lang)];
  try {
    await sendMail({ to: MAIL.to, replyTo: email, subject: copy.cancelSubject(describe(row.start, row.lang)), text: copy.cancelBody(describe(row.start, row.lang), email) });
  } catch (_) {
    console.error('[reunioes] falha a avisar do cancelamento');
  }
  return json(res, 200, { ok: true });
}
