import { prefs, setPref, resetPrefs, applyPrefs } from '../state.js';
import { amIOwner } from '../lib/session.js';

/** A semana de hoje, segunda a domingo — a mesma janela que interessa
 * ver num relance nas Definições, sem abrir o Calendário. */
function weekRange() {
  const now = new Date();
  const day = (now.getDay() + 6) % 7; // segunda = 0
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - day);
  const end = new Date(start);
  end.setDate(end.getDate() + 7);
  const iso = (d) => d.toISOString().slice(0, 10);
  return { from: iso(start), to: iso(end) };
}

export function initSettings(ctx) {
  const el = ctx.contentNode('definicoes');
  if (!el) return;
  const s = ctx.data.strings.definicoes;
  const admin = el.querySelector('[data-admin-group]');
  const meetingsOut = el.querySelector('[data-admin-meetings]');
  const blocksOut = el.querySelector('[data-admin-blocks]');

  async function loadAdmin() {
    if (!admin || !(await amIOwner())) return;
    admin.hidden = false;
    admin.classList.remove('hidden');
    const { from, to } = weekRange();
    try {
      const res = await fetch('/api/reunioes/todas?from=' + from + '&to=' + to, { headers: { Accept: 'application/json' } });
      const data = res.ok ? await res.json() : null;
      const n = data && data.ok ? data.meetings.length : 0;
      meetingsOut.textContent = n ? n + ' ' + s.adminMeetingsWeek : s.adminMeetingsNone;
    } catch (_) {
      meetingsOut.textContent = s.adminMeetingsNone;
    }
    try {
      const res = await fetch('/api/reunioes/bloqueios', { headers: { Accept: 'application/json' } });
      const data = res.ok ? await res.json() : null;
      blocksOut.textContent = String(data && data.ok ? data.overrides.length : 0);
    } catch (_) {
      blocksOut.textContent = '0';
    }
  }

  function sync() {
    applyPrefs();
    el.querySelectorAll('[data-set]').forEach((group) => {
      const kind = group.dataset.set;
      const value = kind === 'lang' ? ctx.data.lang : prefs[kind];
      group.querySelectorAll('[data-value]').forEach((b) => {
        b.setAttribute('aria-pressed', b.dataset.value === value ? 'true' : 'false');
      });
    });
  }

  el.addEventListener('click', (ev) => {
    const b = ev.target.closest('[data-value]');
    if (b) {
      const kind = b.closest('[data-set]').dataset.set;
      if (kind === 'lang') {
        if (b.dataset.value !== ctx.data.lang) location.href = b.dataset.href;
        return;
      }
      setPref(kind, b.dataset.value);
      sync();
      ctx.syncSettings();
      return;
    }
    if (ev.target.closest('[data-reset-os]')) {
      resetPrefs();
      location.reload();
    }
    const action = ev.target.closest('[data-action]');
    if (action) ctx.run(action.dataset.action);
  });

  ctx.syncSettings = () => {
    sync();
    if (ctx.phone) ctx.phone.syncCC();
  };
  sync();
  loadAdmin();
}
