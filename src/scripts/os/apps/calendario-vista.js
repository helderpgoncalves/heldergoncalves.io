// ─────────────────────────────────────────────────────────────────────
// O Calendário: o que se vê.
//
// O mês em grelha, como o do macOS: a semana começa à segunda, o dia de
// hoje leva o círculo vermelho, cada dia diz quantos horários livres
// tem, e as reuniões marcadas aparecem como blocos azuis. Ao lado, o
// dia escolhido, hora a hora — e, sem sessão, o pedido do email.
// ─────────────────────────────────────────────────────────────────────
import { esc } from '../lib/dom.js';

const pad = (n) => String(n).padStart(2, '0');
const keyOf = (d) => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());

export function createView(el, t, ctx, state) {
  const locale = ctx.data.intlLocale;
  const title = el.querySelector('[data-cal-title]');
  const week = el.querySelector('[data-cal-week]');
  const grid = el.querySelector('[data-cal-grid]');
  const side = el.querySelector('[data-cal-side]');
  const session = el.querySelector('[data-cal-session]');
  const sheet = el.querySelector('[data-cal-sheet]');
  const form = el.querySelector('[data-cal-book]');
  const when = el.querySelector('[data-cal-when]');
  const sheetHintEl = el.querySelector('[data-cal-hint]');

  // Os horários mostram-se sempre no fuso de quem os vê — como o
  // Calendly, e não no de Lisboa: o servidor manda instantes UTC
  // (`...Z`), sem opinião nenhuma sobre fuso, e é o browser que os lê
  // no seu próprio relógio só por não lhe dizermos um `timeZone`.
  const visitorTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const monthFmt = new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric' });
  const timeFmt = new Intl.DateTimeFormat(locale, { hour: '2-digit', minute: '2-digit' });
  const longFmt = new Intl.DateTimeFormat(locale, { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' });
  const dayFmt = new Intl.DateTimeFormat(locale, { weekday: 'long', day: 'numeric', month: 'long' });
  const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

  /** O dia local (de quem vê o Calendário) a que um instante pertence —
   * a mesma regra que agrupa os dias na grelha, `keyOf`. */
  const localKey = (iso) => keyOf(new Date(iso));

  let pendingStart = null;
  let handlers = {};

  function byDay() {
    const free = new Map();
    state.slots.forEach((iso) => {
      const k = localKey(iso);
      free.set(k, (free.get(k) || []).concat(iso));
    });
    const mine = new Map();
    state.mine.forEach((m) => {
      const k = localKey(m.start);
      mine.set(k, (mine.get(k) || []).concat(m));
    });
    return { free, mine };
  }

  function renderWeek() {
    const base = new Date(2024, 0, 1); // uma segunda-feira
    week.innerHTML = [0, 1, 2, 3, 4, 5, 6]
      .map((i) => '<span>' + esc(new Intl.DateTimeFormat(locale, { weekday: 'short' }).format(new Date(2024, 0, 1 + i)).replace('.', '')) + '</span>')
      .join('');
    void base;
  }

  function renderGrid() {
    const { free, mine } = byDay();
    const first = state.month;
    const startOffset = (first.getDay() + 6) % 7; // segunda = 0
    const days = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate();
    const today = keyOf(new Date());
    const cells = [];
    const total = Math.ceil((startOffset + days) / 7) * 7;
    for (let i = 0; i < total; i++) {
      const n = i - startOffset + 1;
      const d = new Date(first.getFullYear(), first.getMonth(), n);
      const k = keyOf(d);
      const inMonth = n >= 1 && n <= days;
      const f = free.get(k) || [];
      const m = mine.get(k) || [];
      cells.push(
        '<button type="button" role="gridcell" class="cal-cell' +
          (inMonth ? '' : ' out') +
          (k === today ? ' today' : '') +
          (k === state.selected ? ' on' : '') +
          '" data-day="' + k + '">' +
          '<span class="cal-num">' + d.getDate() + '</span>' +
          m.map((x) => '<span class="cal-ev">' + esc(timeFmt.format(new Date(x.start))) + ' ' + esc(x.title || t.bookTitle) + '</span>').join('') +
          (f.length ? '<span class="cal-free">' + f.length + ' ' + esc(f.length === 1 ? t.free : t.frees) + '</span>' : '') +
          '</button>'
      );
    }
    grid.innerHTML = cells.join('');
    title.textContent = cap(monthFmt.format(first));
  }

  function renderSession() {
    if (!state.enabled) {
      session.innerHTML = '<span class="cal-off">' + esc(t.errors.off) + '</span>';
      return;
    }
    if (state.email) {
      session.innerHTML =
        '<span class="cal-who">' + esc(t.signedAs) + ' <strong>' + esc(state.email) + '</strong></span>' +
        '<button type="button" class="cal-link" data-cal-signout>' + esc(t.signOut) + '</button>';
      return;
    }
    session.innerHTML = '';
  }

  function renderSide() {
    if (!state.email) {
      side.innerHTML =
        '<div class="cal-login">' +
        '<h3>' + esc(t.signIn) + '</h3><p>' + esc(t.signInHint) + '</p>' +
        (state.step === 'email'
          ? '<form data-cal-email><label class="sr" for="cal-email">' + esc(t.email) + '</label>' +
            '<input id="cal-email" type="email" name="email" required autocomplete="email" placeholder="' + esc(t.email) + '" />' +
            '<button class="btn btn-primary" type="submit"' + (state.busy ? ' disabled' : '') + '>' + esc(t.sendCode) + '</button></form>' +
            '<p class="cal-or">' + esc(t.signInOr) + '</p>' +
            '<a class="btn" href="/api/auth/google/start">' + esc(t.signInGoogle) + '</a>'
          : '<form data-cal-code><p class="cal-mail">' + esc(state.pendingEmail) + '</p>' +
            '<label class="sr" for="cal-code">' + esc(t.code) + '</label>' +
            '<input id="cal-code" type="text" inputmode="numeric" pattern="[0-9]{6}" maxlength="6" autocomplete="one-time-code" placeholder="000000" required />' +
            '<button class="btn btn-primary" type="submit"' + (state.busy ? ' disabled' : '') + '>' + esc(t.verify) + '</button>' +
            '<button class="cal-link" type="button" data-cal-resend>' + esc(t.resend) + '</button></form>') +
        '<p class="cal-hint">' + esc(state.hint || '') + '</p>' +
        '</div>';
      return;
    }
    const { free, mine } = byDay();
    const f = free.get(state.selected) || [];
    const m = mine.get(state.selected) || [];
    const d = new Date(state.selected + 'T12:00:00');
    side.innerHTML =
      '<h3 class="cal-dayname">' + esc(cap(dayFmt.format(d))) + '</h3>' +
      '<p class="cal-tz">' + esc(t.tz) + ' (' + esc(visitorTz) + ') · ' + state.minutes + ' ' + esc(t.minutes) + '</p>' +
      (m.length
        ? '<ul class="cal-list mine">' +
          m.map((x) => '<li><span class="cal-time">' + esc(timeFmt.format(new Date(x.start))) + '</span><span class="cal-what">' + esc(x.title || t.bookTitle) + '</span>' +
            '<button type="button" class="cal-link" data-cal-cancel="' + esc(x.id) + '">' + esc(t.cancelMeeting) + '</button></li>').join('') +
          '</ul>'
        : '') +
      (f.length
        ? '<ul class="cal-list">' +
          f.map((iso) => '<li><button type="button" class="cal-slot" data-cal-slot="' + esc(iso) + '"><span class="cal-time">' + esc(timeFmt.format(new Date(iso))) + '</span><span class="cal-what">' + esc(t.free) + '</span></button></li>').join('') +
          '</ul>'
        : '<p class="cal-empty">' + esc(m.length ? '' : t.noSlots) + '</p>') +
      '<p class="cal-hint">' + esc(state.hint || '') + '</p>';
  }

  function render() {
    renderWeek();
    renderGrid();
    renderSession();
    renderSide();
    el.dataset.view = state.view;
    el.querySelectorAll('[data-cal-view]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.calView === state.view)));
  }

  function openSheet(iso) {
    pendingStart = iso;
    when.textContent = cap(longFmt.format(new Date(iso)));
    form.reset();
    sheetHintEl.textContent = '';
    sheet.hidden = false;
    setTimeout(() => form.querySelector('input').focus(), 30);
  }
  const closeSheet = () => {
    sheet.hidden = true;
    pendingStart = null;
  };
  const sheetHint = (text) => (sheetHintEl.textContent = text || '');

  el.addEventListener('click', (ev) => {
    const cell = ev.target.closest('[data-day]');
    if (cell) return handlers.pick(cell.dataset.day);
    const slot = ev.target.closest('[data-cal-slot]');
    if (slot) return openSheet(slot.dataset.calSlot);
    const cancel = ev.target.closest('[data-cal-cancel]');
    if (cancel) return handlers.cancelMeeting(cancel.dataset.calCancel);
    const v = ev.target.closest('[data-cal-view]');
    if (v) return handlers.setView(v.dataset.calView);
    if (ev.target.closest('[data-cal-prev]')) return handlers.prev();
    if (ev.target.closest('[data-cal-next]')) return handlers.next();
    if (ev.target.closest('[data-cal-today]')) return handlers.today();
    if (ev.target.closest('[data-cal-signout]')) return handlers.signOut();
    if (ev.target.closest('[data-cal-resend]')) return handlers.resend();
    if (ev.target.closest('[data-cal-close]') || ev.target === sheet) return closeSheet();
  });

  el.addEventListener('submit', (ev) => {
    const f = ev.target;
    if (f.matches('[data-cal-email]')) {
      ev.preventDefault();
      return handlers.sendCode(f.email.value.trim());
    }
    if (f.matches('[data-cal-code]')) {
      ev.preventDefault();
      return handlers.verify(f.querySelector('#cal-code').value.trim());
    }
    if (f === form) {
      ev.preventDefault();
      if (pendingStart) handlers.book(pendingStart, form.title.value.trim(), form.note.value.trim());
    }
  });

  return { render, closeSheet, sheetHint, wire: (h) => (handlers = h) };
}
