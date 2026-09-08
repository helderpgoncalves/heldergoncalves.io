// ─────────────────────────────────────────────────────────────────────
// A conversa com /api/token.
//
// Três formulários precisam da mesma coisa — um token e a lista do que
// o servidor tem ligado — e antes disto cada um tinha a sua cópia do
// `fetch`. Passa a haver uma só: quem precisar de um token pede aqui.
//
// O token é de uso único do lado do servidor nos formulários que
// enviam alguma coisa, por isso não se guarda nem se partilha: cada
// envio pede o seu.
// ─────────────────────────────────────────────────────────────────────

/** O que o servidor tem ligado. `null` enquanto ninguém perguntou. */
let features = null;

/**
 * Pede um token novo. Guarda de passagem o que está ligado.
 * @returns {Promise<string|null>} o token, ou null se o servidor não deu
 */
export async function requestToken() {
  try {
    const res = await fetch('/api/token', { headers: { Accept: 'application/json' } });
    if (!res.ok) return null;
    const data = await res.json();
    features = {
      contact: data.enabled === true,
      chat: data.chat === true,
      subscribe: data.subscribe === true,
    };
    return typeof data.token === 'string' ? data.token : null;
  } catch (_) {
    features = { contact: false, chat: false, subscribe: false };
    return null;
  }
}

/**
 * O que está ligado, da última vez que se perguntou.
 * @returns {{contact: boolean, chat: boolean, subscribe: boolean}|null}
 */
export const serverFeatures = () => features;

/** Quem está com sessão — o mesmo login serve o Calendário, os
 * comentários e, um dia, o resto do sistema. `null` sem sessão. */
let who = undefined;
let owner = undefined;

/**
 * @returns {Promise<string|null>} o email de quem está com sessão, ou null
 */
export async function whoAmI() {
  if (who !== undefined) return who;
  try {
    const res = await fetch('/api/auth/me', { headers: { Accept: 'application/json' } });
    const data = await res.json().catch(() => ({}));
    who = res.ok && data.ok ? data.email : null;
    owner = res.ok && data.ok ? data.owner === true : false;
  } catch (_) {
    who = null;
    owner = false;
  }
  return who;
}

/** É a sessão do dono? Pede `whoAmI()` primeiro se ainda não se sabe —
 * a mesma chamada a `/api/auth/me` responde às duas perguntas. */
export async function amIOwner() {
  if (owner === undefined) await whoAmI();
  return owner === true;
}

/** Esquece o que se sabia — depois de entrar ou sair, para a próxima
 * pergunta ir mesmo ao servidor. */
export const forgetWho = () => {
  who = undefined;
  owner = undefined;
};

// ── Entrar por magic link ────────────────────────────────────────────
// O Calendário e o ecrã de entrada do sistema pedem a mesma coisa: uma
// ligação por email. Depois disso não há nada para trocar aqui dentro
// — abrir a ligação é uma navegação a sério (GET /api/auth/magic), que
// dá a sessão e volta ao site sozinha. Ver lib/retomar.js para o que
// acontece ao voltar.

const post = (path, body) =>
  fetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(body),
  });

/**
 * Pede uma ligação de entrada para este email.
 * @returns {Promise<{ok: boolean, status: number, error?: string}>}
 */
export async function requestMagicLink(email, lang) {
  const token = await requestToken();
  try {
    const res = await post('/api/auth/start', { email, token, company: '', lang });
    const data = await res.json().catch(() => ({}));
    return { ok: res.ok && data.ok === true, status: res.status, error: data.error };
  } catch (_) {
    return { ok: false, status: 0 };
  }
}

/** Faz o POST em si — usado por `chamarComSessao`, em retomar.js, para
 * não haver dois sítios a montar o mesmo `fetch`. */
export const postJson = post;
