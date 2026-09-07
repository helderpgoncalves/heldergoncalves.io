// ─────────────────────────────────────────────────────────────────────
// Entrar: um código por email, e a sessão.
//
//   POST /api/auth/start    pede o código (email + token do formulário)
//   POST /api/auth/verify   devolve o código, recebe o cookie de sessão
//   GET  /api/auth/me       quem sou
//   POST /api/auth/logout   sair
//
// A resposta ao `start` é a mesma quer o email exista quer não — não
// existe "conta", existe uma caixa de correio, e é ela que prova quem
// é quem.
// ─────────────────────────────────────────────────────────────────────
import { LIMITS, SITE_ORIGIN, authReady } from '../config.mjs';
import { EMAIL_RE, clean, json, oneLine, readJson } from '../http.mjs';
import { bump, checkToken, ipKey, wrongOrigin } from '../security.mjs';
import { sendMail } from '../mail.mjs';
import { AUTH_COPY, pickLang } from '../copy.mjs';
import { clearCookie, issueCode, readSession, sessionCookie, verifyCode } from '../sessions.mjs';

export async function handleAuthStart(req, res) {
  if (!authReady) return json(res, 503, { ok: false, error: 'indisponivel' });

  const bad = wrongOrigin(req, SITE_ORIGIN);
  if (bad) return json(res, bad === 'origem' ? 403 : 415, { ok: false, error: bad });

  const key = ipKey(req);
  if (!bump('auth:' + key, LIMITS.authPerIpWindow, LIMITS.authPerIp)) return json(res, 429, { ok: false, error: 'limite' });
  if (!bump('auth:global', LIMITS.authGlobalWindow, LIMITS.authGlobal)) return json(res, 429, { ok: false, error: 'limite' });

  const payload = await readJson(req);
  if (!payload) return json(res, 400, { ok: false, error: 'corpo' });
  if (clean(payload.company, 200)) return json(res, 200, { ok: true });

  const tokenError = checkToken(payload.token, key, { minAge: LIMITS.subTokenMinAge, singleUse: true });
  if (tokenError) return json(res, 400, { ok: false, error: tokenError });

  const email = oneLine(payload.email, LIMITS.email).toLowerCase();
  if (!EMAIL_RE.test(email)) return json(res, 400, { ok: false, error: 'email' });
  const copy = AUTH_COPY[pickLang(payload.lang)];

  try {
    const code = issueCode(email);
    const sent = await sendMail({ to: email, subject: copy.subject, text: copy.body(code) });
    if (!sent) return json(res, 502, { ok: false, error: 'entrega' });
    console.log('[sessoes] código enviado');
    return json(res, 200, { ok: true });
  } catch (_) {
    console.error('[sessoes] falha ao enviar o código');
    return json(res, 502, { ok: false, error: 'entrega' });
  }
}

export async function handleAuthVerify(req, res) {
  if (!authReady) return json(res, 503, { ok: false, error: 'indisponivel' });
  const bad = wrongOrigin(req, SITE_ORIGIN);
  if (bad) return json(res, bad === 'origem' ? 403 : 415, { ok: false, error: bad });

  const key = ipKey(req);
  if (!bump('verify:' + key, LIMITS.authVerifyWindow, LIMITS.authVerifyPerIp))
    return json(res, 429, { ok: false, error: 'limite' });

  const payload = await readJson(req);
  if (!payload) return json(res, 400, { ok: false, error: 'corpo' });
  const email = oneLine(payload.email, LIMITS.email).toLowerCase();
  const code = oneLine(payload.code, 12).replace(/\s+/g, '');
  if (!EMAIL_RE.test(email) || !/^\d{6}$/.test(code)) return json(res, 400, { ok: false, error: 'codigo' });

  if (!verifyCode(email, code)) return json(res, 400, { ok: false, error: 'codigo' });
  console.log('[sessoes] sessão iniciada');
  res.setHeader('Set-Cookie', sessionCookie(email));
  return json(res, 200, { ok: true, email });
}

export function handleAuthMe(req, res) {
  const email = readSession(req);
  if (!email) return json(res, 401, { ok: false, error: 'sessao', enabled: authReady });
  return json(res, 200, { ok: true, email, enabled: authReady });
}

export function handleAuthLogout(req, res) {
  res.setHeader('Set-Cookie', clearCookie());
  return json(res, 200, { ok: true });
}
