// ─────────────────────────────────────────────────────────────────────
// O Calendário: o estado, e a conversa com o servidor.
//
// Três coisas a saber a cada momento: quem está com sessão, que mês se
// vê, e que horários há nesse mês — os livres e os meus. Tudo o que
// desenha está em calendario-vista.js; aqui decide-se o que se pede e
// quando.
// ─────────────────────────────────────────────────────────────────────
import { requestCode, verifyCode } from '../lib/session.js';
import { createView } from './calendario-vista.js';

const post = (path, body) =>
  fetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(body),
  });

const pad = (n) => String(n).padStart(2, '0');
const dayKey = (d) => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());

// O fuso de quem marca — vai no pedido, para o email de confirmação
// dela usar a mesma hora que ela viu no ecrã, não a de Lisboa.
const visitorTz = Intl.DateTimeFormat().resolvedOptions().timeZone;

export function initCalendario(ctx) {
  const el = ctx.contentNode('calendario');
  if (!el) return;
  const t = ctx.data.strings.calendario;

  const state = {
    email: null,
    owner: false,
    enabled: true,
    month: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
    selected: dayKey(new Date()),
    slots: [],
    mine: [],
    minutes: 30,
    view: 'month',
    busy: false,
    hint: '',
    step: 'email',
    pendingEmail: '',
  };

  const view = createView(el, t, ctx, state);

  /**
   * Do primeiro ao último dia do mês à vista — com um dia de folga de
   * cada lado. Os horários vêm do servidor em UTC e mostram-se no fuso
   * de quem os vê: perto da meia-noite, um horário pode cair no dia
   * anterior ou seguinte do calendário de Lisboa mas no deste mês (ou
   * vice-versa). A folga garante que esse horário chega, mesmo que
   * apareça numa célula "fora do mês" na grelha.
   */
  function range() {
    const from = new Date(state.month.getFullYear(), state.month.getMonth(), 0);
    const to = new Date(state.month.getFullYear(), state.month.getMonth() + 1, 1);
    return { from: dayKey(from), to: dayKey(to) };
  }

  async function loadMonth() {
    if (!state.email) {
      state.slots = [];
      view.render();
      return;
    }
    const { from, to } = range();
    try {
      const res = await fetch('/api/reunioes/disponibilidade?from=' + from + '&to=' + to, { headers: { Accept: 'application/json' } });
      if (res.status === 401) {
        state.email = null;
        state.slots = [];
      } else if (res.ok) {
        const data = await res.json();
        state.slots = data.slots || [];
        state.mine = data.mine || [];
        state.minutes = data.minutes || 30;
      }
    } catch (_) {
      state.hint = t.errors.generic;
    }
    view.render();
  }

  async function whoAmI() {
    try {
      const res = await fetch('/api/auth/me', { headers: { Accept: 'application/json' } });
      const data = await res.json().catch(() => ({}));
      state.enabled = data.enabled !== false;
      state.email = res.ok && data.ok ? data.email : null;
      state.owner = data.owner === true;
    } catch (_) {
      state.email = null;
      state.owner = false;
    }
  }

  const failure = (res, data) =>
    res.status === 429 ? t.errors.limit : res.status === 503 ? t.errors.off : data.error === 'email' ? t.errors.email : t.errors.generic;

  // ── Entrar ─────────────────────────────────────────────────────────
  async function sendCode(email) {
    state.busy = true;
    state.hint = t.sending;
    view.render();
    const res = await requestCode(email, ctx.data.lang);
    if (res.ok) {
      state.step = 'code';
      state.pendingEmail = email;
      state.hint = t.codeHint;
    } else {
      state.hint = res.status === 429 ? t.errors.limit : res.status === 503 ? t.errors.off : res.error === 'email' ? t.errors.email : t.errors.generic;
    }
    state.busy = false;
    view.render();
  }

  async function verify(code) {
    state.busy = true;
    state.hint = t.sending;
    view.render();
    const res = await verifyCode(state.pendingEmail, code);
    if (res.ok) {
      state.email = res.email;
      state.owner = res.owner;
      state.step = 'email';
      state.hint = '';
      ctx.notify(t.signedAs + ' ' + res.email);
      await loadMonth();
    } else {
      state.hint = res.status === 429 ? t.errors.limit : t.errors.code;
    }
    state.busy = false;
    view.render();
  }

  async function signOut() {
    await post('/api/auth/logout', {}).catch(() => {});
    state.email = null;
    state.owner = false;
    state.slots = [];
    state.mine = [];
    forgetWho();
    view.render();
  }

  // ── Marcar e desmarcar ─────────────────────────────────────────────
  async function book(start, title, note) {
    state.busy = true;
    view.sheetHint(t.sending);
    try {
      const res = await post('/api/reunioes', { start, title, note, lang: ctx.data.lang, tz: visitorTz });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.ok) {
        view.closeSheet();
        state.hint = t.booked;
        ctx.notify(t.booked);
        await loadMonth();
      } else view.sheetHint(res.status === 409 ? t.errors.taken : failure(res, data));
    } catch (_) {
      view.sheetHint(t.errors.generic);
    }
    state.busy = false;
  }

  async function cancelMeeting(id) {
    try {
      const res = await post('/api/reunioes/cancelar', { id });
      if (res.ok) {
        state.hint = t.cancelled;
        ctx.notify(t.cancelled);
      }
    } catch (_) {
      state.hint = t.errors.generic;
    }
    await loadMonth();
  }

  view.wire({
    prev: () => {
      state.month = new Date(state.month.getFullYear(), state.month.getMonth() - 1, 1);
      loadMonth();
    },
    next: () => {
      state.month = new Date(state.month.getFullYear(), state.month.getMonth() + 1, 1);
      loadMonth();
    },
    today: () => {
      state.month = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
      state.selected = dayKey(new Date());
      loadMonth();
    },
    pick: (key) => {
      state.selected = key;
      state.view = 'day';
      view.render();
    },
    setView: (v) => {
      state.view = v;
      view.render();
    },
    sendCode,
    verify,
    signOut,
    book,
    cancelMeeting,
    resend: () => {
      state.step = 'email';
      view.render();
    },
  });

  let prepared = false;
  ctx.prepareCalendar = async () => {
    if (prepared) return;
    prepared = true;
    await whoAmI();
    await loadMonth();
  };

  view.render();
}
