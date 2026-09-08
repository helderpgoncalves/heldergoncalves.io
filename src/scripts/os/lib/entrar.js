// ─────────────────────────────────────────────────────────────────────
// Entrar: o ecrã do sistema, aberto pelo menu Apple (Mac) ou pelo menu
// de sistema (iOS) — dois avatares, Visitante ou Entrar, como o ecrã de
// início de sessão do macOS. A mesma sessão de sempre: `whoAmI`,
// `requestCode`/`verifyCode` de `session.js`, o mesmo cookie que o
// Calendário já usa. Nenhuma app precisa de saber que este ecrã existe
// — todas leem `whoAmI()`.
// ─────────────────────────────────────────────────────────────────────
import { whoAmI, forgetWho, requestCode, verifyCode } from './session.js';

export function createEntrar(ctx) {
  const el = document.getElementById('entrar');
  if (!el) return { open: () => {}, close: () => {} };
  const t = ctx.data.strings.entrar;
  const k = ctx.data.strings.calendario;

  const avatars = el.querySelector('[data-entrar-avatars]');
  const signed = el.querySelector('[data-entrar-signed]');
  const emailOut = el.querySelector('[data-entrar-email-out]');
  const form = el.querySelector('[data-entrar-form]');
  const emailForm = el.querySelector('[data-entrar-email]');
  const codeForm = el.querySelector('[data-entrar-code]');
  const pending = el.querySelector('[data-entrar-pending]');
  const hint = el.querySelector('[data-entrar-hint]');

  let pendingEmail = '';

  const setHint = (text) => {
    hint.textContent = text || '';
  };

  const showStep = (step) => {
    emailForm.hidden = step !== 'email';
    codeForm.hidden = step !== 'code';
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
    refresh();
  }

  function close() {
    el.hidden = true;
  }

  el.querySelector('[data-entrar-guest]').addEventListener('click', close);
  el.querySelector('[data-entrar-close]').addEventListener('click', close);

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

  emailForm.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    const email = new FormData(emailForm).get('email');
    setHint(k.sending);
    const res = await requestCode(String(email), ctx.data.lang);
    if (res.ok) {
      pendingEmail = String(email);
      pending.textContent = pendingEmail;
      showStep('code');
      setHint(k.codeHint);
    } else {
      setHint(res.status === 429 ? k.errors.limit : res.status === 503 ? k.errors.off : res.error === 'email' ? k.errors.email : k.errors.generic);
    }
  });

  codeForm.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    const code = new FormData(codeForm).get('code');
    setHint(k.sending);
    const res = await verifyCode(pendingEmail, String(code));
    if (res.ok) {
      setHint('');
      ctx.notify(k.signedAs + ' ' + res.email);
      ctx.onSessionChange && ctx.onSessionChange();
      await refresh();
    } else {
      setHint(res.status === 429 ? k.errors.limit : k.errors.code);
    }
  });

  el.addEventListener('click', (ev) => {
    if (ev.target === el) close();
  });

  return { open, close, refresh };
}
