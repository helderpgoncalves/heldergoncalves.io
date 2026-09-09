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

  const WEEK_SPAN = 'text-right px-2 text-[length:var(--t-caption)] font-semibold text-(--ink-3) uppercase';

  function renderWeek() {
    const base = new Date(2024, 0, 1); // uma segunda-feira
    week.innerHTML = [0, 1, 2, 3, 4, 5, 6]
      .map((i) => '<span class="' + WEEK_SPAN + '">' + esc(new Intl.DateTimeFormat(locale, { weekday: 'short' }).format(new Date(2024, 0, 1 + i)).replace('.', '')) + '</span>')
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
        '<button type="button" role="gridcell" class="cal-cell relative flex min-h-16 flex-col items-stretch gap-0.5 border-b-[0.5px] border-r-[0.5px] border-(--line) px-1.5 py-1 overflow-hidden text-left text-[length:var(--t-caption)] text-(--ink) @max-[720px]/app:min-h-12 @max-[720px]/app:px-1 @max-[720px]/app:py-0.75' +
          (inMonth ? '' : ' out text-(--ink-3) bg-(--surface-2)') +
          (k === today ? ' today' : '') +
          (k === state.selected ? ' on bg-(--surface-3)' : '') +
          '" data-day="' + k + '">' +
          '<span class="cal-num self-end grid h-[22px] w-[22px] place-items-center rounded-full text-[length:var(--t-foot)] font-semibold' + (k === today ? ' bg-(--red) text-white' : '') + '">' + d.getDate() + '</span>' +
          m.map((x) => '<span class="cal-ev overflow-hidden text-ellipsis whitespace-nowrap bg-(--accent) px-1.5 py-px font-medium text-white @max-[720px]/app:hidden">' + esc(timeFmt.format(new Date(x.start))) + ' ' + esc(x.title || t.bookTitle) + '</span>').join('') +
          (f.length ? '<span class="cal-free whitespace-nowrap bg-(--green-tint) px-1.5 py-px font-semibold text-(--green) @max-[720px]/app:bg-transparent @max-[720px]/app:p-0 @max-[720px]/app:text-[length:var(--t-caption2)]">' + f.length + ' ' + esc(f.length === 1 ? t.free : t.frees) + '</span>' : '') +
          '</button>'
      );
    }
    grid.innerHTML = cells.join('');
    title.textContent = cap(monthFmt.format(first));
  }

  function renderSession() {
    if (!state.enabled) {
      session.innerHTML = '<span class="cal-off text-(--orange)">' + esc(t.errors.off) + '</span>';
      return;
    }
    if (state.email) {
      session.innerHTML =
        '<span class="cal-who @max-[720px]/app:hidden">' + esc(t.signedAs) + ' <strong class="font-semibold text-(--ink)">' + esc(state.email) + '</strong></span>' +
        '<button type="button" class="cal-link min-h-6 text-[length:var(--t-foot)] font-medium text-(--accent)" data-cal-signout>' + esc(t.signOut) + '</button>';
      return;
    }
    session.innerHTML = '';
  }

  function renderSide() {
    if (!state.email) {
      side.innerHTML =
        '<div class="cal-login">' +
        '<h3 class="m-0 mb-1 text-[length:var(--t-headline)]">' + esc(t.signIn) + '</h3><p class="m-0 mb-3 text-[length:var(--t-subhead)] text-(--ink-2)">' + esc(t.signInHint) + '</p>' +
        '<button type="button" class="btn btn-primary w-full justify-center no-underline" data-cal-signin>' + esc(t.signIn) + '</button>' +
        '</div>';
      return;
    }
    const { free, mine } = byDay();
    const f = free.get(state.selected) || [];
    const m = mine.get(state.selected) || [];
    const d = new Date(state.selected + 'T12:00:00');
    side.innerHTML =
      '<h3 class="cal-dayname m-0 text-[length:var(--t-headline)] font-bold">' + esc(cap(dayFmt.format(d))) + '</h3>' +
      '<p class="cal-tz my-0.5 mb-3 text-[length:var(--t-caption)] text-(--ink-3)">' + esc(t.tz) + ' (' + esc(visitorTz) + ') · ' + state.minutes + ' ' + esc(t.minutes) + '</p>' +
      (m.length
        ? '<ul class="cal-list mine m-0 mb-3.5 grid list-none gap-1.5 p-0">' +
          m.map((x) => '<li class="flex items-center gap-2.5 bg-(--accent) px-3 py-2.25 text-white"><span class="cal-time min-w-[46px] font-semibold tabular-nums">' + esc(timeFmt.format(new Date(x.start))) + '</span><span class="cal-what flex-1 min-w-0 overflow-hidden text-ellipsis whitespace-nowrap text-[length:var(--t-subhead)]">' + esc(x.title || t.bookTitle) + '</span>' +
            '<button type="button" class="cal-link ml-auto min-h-6 text-[length:var(--t-foot)] font-medium text-white/90" data-cal-cancel="' + esc(x.id) + '">' + esc(t.cancelMeeting) + '</button></li>').join('') +
          '</ul>'
        : '') +
      (f.length
        ? '<ul class="cal-list m-0 mb-3.5 grid list-none gap-1.5 p-0">' +
          f.map((iso) => '<li class="flex items-center gap-2.5"><button type="button" class="cal-slot flex flex-1 items-center gap-2.5 border-[0.5px] border-(--line) bg-(--surface-solid) px-3 py-2.25 text-left text-(--ink) transition-[background,transform] duration-120 ease-(--ease-os) hover:bg-(--surface-3) active:scale-98" data-cal-slot="' + esc(iso) + '"><span class="cal-time min-w-[46px] font-semibold tabular-nums">' + esc(timeFmt.format(new Date(iso))) + '</span><span class="cal-what flex-1 min-w-0 overflow-hidden text-ellipsis whitespace-nowrap text-[length:var(--t-subhead)]">' + esc(t.free) + '</span></button></li>').join('') +
          '</ul>'
        : '<p class="cal-empty m-0 text-[length:var(--t-subhead)] text-(--ink-3)">' + esc(m.length ? '' : t.noSlots) + '</p>') +
      '<p class="cal-hint m-0 mt-2.5 min-h-[1.2em] text-[length:var(--t-caption)] text-(--ink-3)">' + esc(state.hint || '') + '</p>';
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
    if (ev.target.closest('[data-cal-signin]')) return handlers.signIn();
    if (ev.target.closest('[data-cal-close]') || ev.target === sheet) return closeSheet();
  });

  el.addEventListener('submit', (ev) => {
    const f = ev.target;
    if (f === form) {
      ev.preventDefault();
      if (pendingStart) handlers.book(pendingStart, form.title.value.trim(), form.note.value.trim());
    }
  });

  return { render, closeSheet, sheetHint, wire: (h) => (handlers = h) };
}
