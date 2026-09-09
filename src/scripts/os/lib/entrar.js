// ─────────────────────────────────────────────────────────────────────
// Entrar: o ecrã do sistema, aberto pelo menu Apple (Mac) ou pelo menu
// de sistema (iOS) — dois avatares, Visitante ou Entrar, como o ecrã de
// início de sessão do macOS. A mesma sessão de sempre: `whoAmI`,
// `requestMagicLink` de `session.js`, o mesmo cookie que o Calendário
// já usa. Nenhuma app precisa de saber que este ecrã existe — todas
// leem `whoAmI()`, ou chamam `chamarComSessao()` (retomar.js) para uma
// acção que precisa de sessão.
// ─────────────────────────────────────────────────────────────────────
import { whoAmI, forgetWho, requestMagicLink } from './session.js';
import { retomar } from './retomar.js';

export function createEntrar(ctx) {
  const el = document.getElementById('entrar');
  if (!el) return { open: () => {}, close: () => {} };
  const t = ctx.data.strings.entrar;
  const k = ctx.data.strings.calendario;

  const avatars = el.querySelector('[data-entrar-avatars]');
  const signed = el.querySelector('[data-entrar-signed]');
  const emailOut = el.querySelector('[data-entrar-email-out]');
  const form = el.querySelector('[data-entrar-form]');
  const request = el.querySelector('[data-entrar-request]');
  const emailForm = el.querySelector('[data-entrar-email]');
  const waiting = el.querySelector('[data-entrar-waiting]');
  const pending = el.querySelector('[data-entrar-pending]');
  const resend = el.querySelector('[data-entrar-resend]');
  const hint = el.querySelector('[data-entrar-hint]');
  const timeOut = el.querySelector('[data-entrar-time]');
  const dateOut = el.querySelector('[data-entrar-date]');

  let pendingEmail = '';
  let pollTimer = null;
  let clockTimer = null;

  // ── O relógio grande, como o ecrã de bloqueio ────────────────────
  // Só existe aqui: não há um segundo sítio (o lock do iOS) a precisar
  // do mesmo formato, por isso não vale um módulo à parte.
  function tickClock() {
    const now = new Date();
    const lang = ctx.data.lang === 'pt' ? 'pt-PT' : 'en-US';
    timeOut.textContent = now.toLocaleTimeString(lang, { hour: '2-digit', minute: '2-digit' });
    dateOut.textContent = now.toLocaleDateString(lang, { weekday: 'long', day: 'numeric', month: 'long' });
  }

  function startClock() {
    stopClock();
    tickClock();
    clockTimer = setInterval(tickClock, 1000 * 15);
  }

  function stopClock() {
    if (clockTimer) clearInterval(clockTimer);
    clockTimer = null;
  }

  const setHint = (text) => {
    hint.textContent = text || '';
  };

  const showStep = (step) => {
    request.hidden = step !== 'email';
    waiting.hidden = step !== 'waiting';
  };

  async function refresh() {
    const email = await whoAmI();
    signed.hidden = !email;
    avatars.hidden = Boolean(email);
    form.hidden = true;
    if (email) emailOut.textContent = email;
  }

  function open() {
    el.hidden = false;
    setHint('');
    showStep('email');
    startClock();
    refresh();
  }

  function close() {
    el.hidden = true;
    stopClock();
    stopWatching();
  }

  // ── Detectar que a sessão ficou activa noutra aba ────────────────
  // A pessoa pediu a ligação aqui, abriu-a no Mail (ou no telemóvel), e
  // pode voltar a este separador sem carregar em nada. Verifica-se
  // sozinho quando a aba volta a ficar visível, e a espaços enquanto
  // fica — nunca mais depressa do que isso, não é uma corrida.
  function startWatching() {
    stopWatching();
    document.addEventListener('visibilitychange', onVisible);
    pollTimer = setInterval(checkSignedIn, 4000);
  }

  function stopWatching() {
    document.removeEventListener('visibilitychange', onVisible);
    if (pollTimer) clearInterval(pollTimer);
    pollTimer = null;
  }

  function onVisible() {
    if (document.visibilityState === 'visible') checkSignedIn();
  }

  async function checkSignedIn() {
    forgetWho();
    const email = await whoAmI();
    if (!email) return;
    stopWatching();
    setHint('');
    ctx.notify(k.signedAs + ' ' + email, { title: ctx.data.strings.welcome });
    ctx.onSessionChange && ctx.onSessionChange();
    await refresh();
    close();
    await retomar(ctx);
  }

  el.querySelector('[data-entrar-guest]').addEventListener('click', () => {
    close();
    ctx.notify(t.guest, { title: ctx.data.strings.welcome, icon: '/memoji-visitante.png' });
  });

  el.querySelector('[data-entrar-signin]').addEventListener('click', () => {
    avatars.hidden = true;
    form.hidden = false;
    showStep('email');
  });

  el.querySelector('[data-entrar-signout]').addEventListener('click', async () => {
    await fetch('/api/auth/logout', { method: 'POST' }).catch(() => {});
    forgetWho();
    await refresh();
    ctx.onSessionChange && ctx.onSessionChange();
  });

  async function sendLink(email) {
    setHint(k.sending);
    const res = await requestMagicLink(email, ctx.data.lang);
    if (res.ok) {
      pendingEmail = email;
      pending.textContent = pendingEmail;
      showStep('waiting');
      setHint('');
      startWatching();
    } else {
      setHint(res.status === 429 ? k.errors.limit : res.status === 503 ? k.errors.off : res.error === 'email' ? k.errors.email : k.errors.generic);
    }
  }

  emailForm.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    const email = String(new FormData(emailForm).get('email') || '');
    await sendLink(email);
  });

  resend.addEventListener('click', () => sendLink(pendingEmail));

  el.addEventListener('click', (ev) => {
    if (ev.target === el) close();
  });

  return { open, close, refresh };
}
