// ─────────────────────────────────────────────────────────────────────
// As ferramentas do agente.
//
// São três, e são as mesmas para o modelo que responde nas Mensagens e
// para um agente de fora que chegue por MCP. Estão aqui, longe dos dois
// endpoints, para não haver duas versões da mesma coisa: acrescentar uma
// ferramenta é acrescentar uma entrada em TOOLS e um ramo em runTool.
//
// Cada ferramenta devolve texto para o modelo ler. Nunca lança: uma
// falha é uma frase que diz o que correu mal e o que fazer a seguir.
// ─────────────────────────────────────────────────────────────────────
import { BOOKING, LIMITS, mailReady } from '../config.mjs';
import { EMAIL_RE, clean, oneLine } from '../http.mjs';
import { bump } from '../security.mjs';
import { deliverToOwner } from '../mail.mjs';
import { search } from '../knowledge.mjs';

const EMAIL_DIRETO = 'helder@heldergoncalves.io';

export const TOOLS = [
  {
    type: 'function',
    function: {
      name: 'procurar',
      description:
        'Procura na base de conhecimento do Hélder e nos escritos publicados. Usa sempre isto antes de responder sobre projetos, disponibilidade, preços, ferramentas, o site ou textos.',
      parameters: {
        type: 'object',
        properties: { consulta: { type: 'string', description: 'Palavras-chave do que procuras.' } },
        required: ['consulta'],
        additionalProperties: false,
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'marcar_reuniao',
      description:
        'Pede uma conversa com o Hélder. Só usar depois de teres nome, email e uma ideia do assunto — pergunta-os primeiro.',
      parameters: {
        type: 'object',
        properties: {
          nome: { type: 'string' },
          email: { type: 'string' },
          assunto: { type: 'string', description: 'O problema, em poucas palavras.' },
          preferencia: { type: 'string', description: 'Quando dá jeito à pessoa. Opcional.' },
        },
        required: ['nome', 'email', 'assunto'],
        additionalProperties: false,
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'enviar_mensagem',
      description: 'Envia uma mensagem por email ao Hélder. Só usar com o consentimento da pessoa e com o email dela.',
      parameters: {
        type: 'object',
        properties: {
          nome: { type: 'string' },
          email: { type: 'string' },
          mensagem: { type: 'string' },
        },
        required: ['nome', 'email', 'mensagem'],
        additionalProperties: false,
      },
    },
  },
];

async function marcarReuniao({ nome, email, assunto, quando }, key) {
  if (!bump('book:' + key, LIMITS.perIpWindow, 2)) return 'Já foram feitos pedidos que cheguem daqui. Sugere o email.';

  if (BOOKING.webhook) {
    try {
      const res = await fetch(BOOKING.webhook, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nome, email, assunto, quando, source: 'heldergoncalves.io' }),
        signal: AbortSignal.timeout(8000),
      });
      if (res.ok) {
        console.log('[agente] pedido de reuniao registado');
        return 'Pedido registado. Diz à pessoa que o Hélder confirma por email para ' + email + '.';
      }
    } catch (_) {
      /* cai para as alternativas */
    }
  }
  if (BOOKING.url) return 'Dá esta ligação à pessoa para escolher a hora: ' + BOOKING.url;
  if (mailReady) {
    try {
      const sent = await deliverToOwner({
        from: email,
        subject: 'Pedido de conversa: ' + assunto,
        message: nome + ' quer falar contigo.\n\nAssunto: ' + assunto + (quando ? '\nQuando lhe dá jeito: ' + quando : ''),
      });
      if (sent) {
        console.log('[agente] pedido de reuniao enviado por email');
        return 'Pedido enviado ao Hélder. Ele responde a ' + email + '.';
      }
    } catch (_) {
      /* cai para o email direto */
    }
  }
  return 'Não há agenda ligada. Diz à pessoa para escrever a ' + EMAIL_DIRETO + '.';
}

async function enviarMensagem({ nome, email, mensagem }, key) {
  if (mensagem.length < 10) return 'A mensagem é demasiado curta. Pede mais contexto à pessoa.';
  if (!mailReady) return 'O envio não está ligado. Diz à pessoa para escrever a ' + EMAIL_DIRETO + '.';
  if (!bump('msg:' + key, LIMITS.perIpWindow, LIMITS.perIp))
    return 'Já foram enviadas mensagens que cheguem daqui. Sugere o email.';
  if (!bump('msg:global', LIMITS.globalWindow, LIMITS.global)) return 'Não é possível enviar agora. Sugere o email.';

  try {
    const sent = await deliverToOwner({
      from: email,
      subject: 'Mensagem de ' + nome + ' (assistente do site)',
      message: mensagem,
    });
    if (!sent) return 'Não consegui enviar. Diz à pessoa para escrever a ' + EMAIL_DIRETO + '.';
    console.log('[agente] mensagem entregue');
    return 'Mensagem entregue. O Hélder responde a ' + email + '.';
  } catch (_) {
    return 'Não consegui enviar. Diz à pessoa para escrever a ' + EMAIL_DIRETO + '.';
  }
}

/**
 * Corre uma ferramenta. `key` é a impressão digital do visitante, para
 * os limites — nunca o IP.
 * @returns {Promise<string>} texto para o modelo ler
 */
export async function runTool(name, args, key) {
  if (name === 'procurar') return search(clean(args.consulta, 200));

  // As outras duas mandam email: sem um email válido não se faz nada.
  const nome = oneLine(args.nome, 80);
  const email = oneLine(args.email, LIMITS.email);
  if (!EMAIL_RE.test(email)) return 'Email inválido. Pede o email correto à pessoa antes de tentar outra vez.';

  if (name === 'marcar_reuniao') {
    return marcarReuniao(
      {
        nome,
        email,
        assunto: oneLine(args.assunto, LIMITS.subject) || 'Conversa',
        quando: oneLine(args.preferencia, 120),
      },
      key
    );
  }
  if (name === 'enviar_mensagem') {
    return enviarMensagem({ nome, email, mensagem: clean(args.mensagem, LIMITS.message) }, key);
  }
  return 'Ferramenta desconhecida.';
}
