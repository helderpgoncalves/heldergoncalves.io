// ─────────────────────────────────────────────────────────────────────
// Entregar email.
//
// Dois caminhos, e o mesmo contrato para quem chama: `deliver` devolve
// true se saiu, false se não. Acrescentar um terceiro fornecedor é
// acrescentar um ramo aqui e uma linha em config.mjs — mais nada no
// resto do servidor precisa de saber qual é.
// ─────────────────────────────────────────────────────────────────────
import { MAIL } from './config.mjs';

const TIMEOUT = 10000;

async function viaResend(msg) {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + MAIL.key, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: MAIL.from,
      to: [msg.to || MAIL.to],
      reply_to: msg.replyTo || undefined,
      subject: msg.subject,
      text: msg.text,
    }),
    signal: AbortSignal.timeout(TIMEOUT),
  });
  return res.ok;
}

async function viaWebhook(msg) {
  const res = await fetch(MAIL.webhook, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      to: msg.to || MAIL.to,
      from: msg.replyTo || MAIL.from,
      subject: msg.subject,
      message: msg.text,
      source: 'heldergoncalves.io',
    }),
    signal: AbortSignal.timeout(TIMEOUT),
  });
  return res.ok;
}

/**
 * Envia um email.
 * @param {{to?: string, replyTo?: string, subject: string, text: string}} msg
 * @returns {Promise<boolean>} true se o fornecedor aceitou.
 */
export function sendMail(msg) {
  if (MAIL.provider === 'resend') return viaResend(msg);
  return viaWebhook(msg);
}

/** O caso mais comum: alguém escreve ao Hélder a partir do site. */
export function deliverToOwner({ from, subject, message }) {
  return sendMail({
    replyTo: from,
    subject: '[site] ' + subject,
    text: 'Mensagem de heldergoncalves.io\n\nDe: ' + from + '\nAssunto: ' + subject + '\n\n' + message + '\n',
  });
}
