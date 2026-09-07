// ─────────────────────────────────────────────────────────────────────
// Subscrever o blog.
//
// Dupla confirmação, que é a única forma honesta de fazer isto: pedir a
// subscrição não põe ninguém na lista, só manda um email com uma
// ligação. Quem não carregar na ligação nunca recebe nada — e quem
// escrever o email de outra pessoa não a inscreve.
//
// Três endpoints:
//   POST /api/subscribe              pede, e manda o email
//   GET  /api/subscribe/confirm      entra mesmo na lista
//   GET  /api/subscribe/unsubscribe  sai da lista, e nunca expira
//
// A resposta ao POST é sempre a mesma quer o email já esteja na lista
// quer não: dizer "esse já cá está" seria contar a um estranho quem
// subscreveu.
// ─────────────────────────────────────────────────────────────────────
import { LIMITS, SITE_ORIGIN, newsletterReady } from '../config.mjs';
import { EMAIL_RE, clean, html, json, oneLine, readJson, escapeHtml } from '../http.mjs';
import { bump, checkToken, ipKey, wrongOrigin } from '../security.mjs';
import { sendMail } from '../mail.mjs';
import { NEWSLETTER_COPY, pickLang } from '../copy.mjs';
import { linkFor, markActive, markGone, markPending, readLink, statusOf } from '../subscribers.mjs';

/** Uma página inteira, sem depender de nada do site. */
function page(res, status, copy, title, body) {
  return html(
    res,
    status,
    '<!doctype html><html lang="' +
      copy.lang +
      '"><head><meta charset="utf-8">' +
      '<meta name="viewport" content="width=device-width,initial-scale=1">' +
      '<meta name="robots" content="noindex">' +
      '<title>' +
      escapeHtml(title) +
      '</title><style>' +
      'body{margin:0;min-height:100vh;display:grid;place-items:center;padding:24px;' +
      'font:17px/1.5 -apple-system,BlinkMacSystemFont,"SF Pro Text",system-ui,sans-serif;' +
      'color:#1d1d1f;background:#fff}' +
      'main{max-width:34rem;text-align:center}' +
      'h1{font-size:28px;letter-spacing:-.02em;margin:0 0 8px}' +
      'p{margin:0 0 24px;color:#8e8e93}' +
      'a{display:inline-block;padding:11px 22px;border-radius:999px;background:#007aff;color:#fff;' +
      'text-decoration:none;font-weight:500}' +
      '@media(prefers-color-scheme:dark){body{background:#1c1c1e;color:#f5f5f7}a{background:#0a84ff}}' +
      '</style></head><body><main><h1>' +
      escapeHtml(title) +
      '</h1><p>' +
      escapeHtml(body) +
      '</p><a href="' +
      SITE_ORIGIN +
      '">' +
      escapeHtml(copy.back) +
      '</a></main></body></html>'
  );
}

export async function handleSubscribe(req, res) {
  if (!newsletterReady) return json(res, 503, { ok: false, error: 'indisponivel' });

  const bad = wrongOrigin(req, SITE_ORIGIN);
  if (bad) return json(res, bad === 'origem' ? 403 : 415, { ok: false, error: bad });

  const key = ipKey(req);
  if (!bump('sub:' + key, LIMITS.subPerIpWindow, LIMITS.subPerIp))
    return json(res, 429, { ok: false, error: 'limite' });
  if (!bump('sub:global', LIMITS.subGlobalWindow, LIMITS.subGlobal))
    return json(res, 429, { ok: false, error: 'limite' });

  const payload = await readJson(req);
  if (!payload) return json(res, 400, { ok: false, error: 'corpo' });

  // Armadilha: campo invisível que só um robô preenche. Responde "ok"
  // para o robô não perceber que foi apanhado — e não faz nada.
  if (clean(payload.company, 200)) return json(res, 200, { ok: true });

  const tokenError = checkToken(payload.token, key, { minAge: LIMITS.subTokenMinAge, singleUse: true });
  if (tokenError) return json(res, 400, { ok: false, error: tokenError });

  const email = oneLine(payload.email, LIMITS.email).toLowerCase();
  if (!EMAIL_RE.test(email)) return json(res, 400, { ok: false, error: 'email' });

  const lang = pickLang(payload.lang);
  const copy = NEWSLETTER_COPY[lang];

  // Já confirmado: não se manda nada, e responde-se como se tivesse
  // corrido bem. Quem está na lista sabe que está.
  if (statusOf(email) === 'active') return json(res, 200, { ok: true });

  try {
    await markPending(email, lang);
    const sent = await sendMail({
      to: email,
      subject: copy.confirmSubject,
      text: copy.confirmBody(linkFor(SITE_ORIGIN, 'confirm', email), linkFor(SITE_ORIGIN, 'unsubscribe', email)),
    });
    if (!sent) return json(res, 502, { ok: false, error: 'entrega' });
    console.log('[newsletter] pedido de confirmação enviado');
    return json(res, 200, { ok: true });
  } catch (_) {
    console.error('[newsletter] falha ao enviar a confirmação');
    return json(res, 502, { ok: false, error: 'entrega' });
  }
}

export async function handleConfirm(req, res, url) {
  const copy = NEWSLETTER_COPY[pickLang(url.searchParams.get('lang'))];
  const email = readLink('confirm', url.searchParams);
  if (!email) return page(res, 400, copy, copy.badTitle, copy.badBody);

  const done = await markActive(email);
  if (!done) return page(res, 400, copy, copy.badTitle, copy.badBody);
  console.log('[newsletter] subscrição confirmada');
  return page(res, 200, copy, copy.okTitle, copy.okBody);
}

export async function handleUnsubscribe(req, res, url) {
  const copy = NEWSLETTER_COPY[pickLang(url.searchParams.get('lang'))];
  const email = readLink('unsubscribe', url.searchParams);
  if (!email) return page(res, 400, copy, copy.badTitle, copy.badBody);

  await markGone(email);
  console.log('[newsletter] subscrição cancelada');
  return page(res, 200, copy, copy.goneTitle, copy.goneBody);
}
