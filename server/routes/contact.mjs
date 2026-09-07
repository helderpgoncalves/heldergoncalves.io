// ─────────────────────────────────────────────────────────────────────
// A mensagem de contacto.
//
// Quatro coisas têm de estar certas antes de sair um email: a origem, o
// token do formulário, a armadilha por preencher, e os limites por
// visitante. Se o email não estiver configurado, o site volta ao
// `mailto:` e não se perde nada.
// ─────────────────────────────────────────────────────────────────────
import { LIMITS, SITE_ORIGIN, mailReady } from '../config.mjs';
import { EMAIL_RE, clean, json, oneLine, readJson } from '../http.mjs';
import { bump, checkToken, ipKey, wrongOrigin } from '../security.mjs';
import { deliverToOwner } from '../mail.mjs';

export async function handleContact(req, res) {
  if (!mailReady) return json(res, 503, { ok: false, error: 'indisponivel' });

  const bad = wrongOrigin(req, SITE_ORIGIN);
  if (bad) return json(res, bad === 'origem' ? 403 : 415, { ok: false, error: bad });

  const key = ipKey(req);
  if (!bump('msg:' + key, LIMITS.perIpWindow, LIMITS.perIp)) return json(res, 429, { ok: false, error: 'limite' });
  if (!bump('msg:global', LIMITS.globalWindow, LIMITS.global)) return json(res, 429, { ok: false, error: 'limite' });

  const payload = await readJson(req);
  if (!payload) return json(res, 400, { ok: false, error: 'corpo' });

  // Armadilha: campo invisível que só um robô preenche. Responde "ok"
  // para o robô não perceber que foi apanhado — e não envia nada.
  if (clean(payload.company, 200)) return json(res, 200, { ok: true });

  const tokenError = checkToken(payload.token, key, { minAge: LIMITS.tokenMinAge, singleUse: true });
  if (tokenError) return json(res, 400, { ok: false, error: tokenError });

  const from = oneLine(payload.from, LIMITS.email);
  const subject = oneLine(payload.subject, LIMITS.subject) || 'Mensagem do site';
  const message = clean(payload.message, LIMITS.message);
  if (!EMAIL_RE.test(from)) return json(res, 400, { ok: false, error: 'email' });
  if (message.length < 10) return json(res, 400, { ok: false, error: 'curto' });

  try {
    const sent = await deliverToOwner({ from, subject, message });
    if (!sent) return json(res, 502, { ok: false, error: 'entrega' });
    console.log('[contacto] mensagem entregue');
    return json(res, 200, { ok: true });
  } catch (_) {
    console.error('[contacto] falha na entrega');
    return json(res, 502, { ok: false, error: 'entrega' });
  }
}
