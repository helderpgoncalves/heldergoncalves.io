import { createHmac, randomInt, timingSafeEqual } from 'node:crypto';

// O número de WhatsApp nunca está no código nem no HTML: só sai da API, a quem diz o e-mail e resolve o desafio.
// Fica em WHATSAPP_NUMERO (só dígitos, com indicativo, ex. 351912345678) nas variáveis de ambiente.
const MINUTOS = 10;
const ESPERA_MIN_MS = 2500; // uma pessoa não responde em menos de 2,5 s; um robô sim

const segredo = () => {
  const s = process.env.NEWSLETTER_SECRET;
  return s && s.length >= 32 ? s : null;
};
export const numero = () => {
  const n = process.env.WHATSAPP_NUMERO?.replace(/\D/g, '');
  return n && n.length >= 9 ? n : null;
};
export const contactoConfigurado = () => Boolean(segredo() && numero());

const assinar = (dados: string) => createHmac('sha256', segredo()!).update(dados).digest('base64url');
const NOMES = ['zero', 'um', 'dois', 'três', 'quatro', 'cinco', 'seis', 'sete', 'oito', 'nove', 'dez', 'onze', 'doze', 'treze', 'catorze', 'quinze', 'dezasseis', 'dezassete', 'dezoito'];

/** Um desafio sem estado: a resposta certa vai dentro do token, assinada, e só se confere no servidor. */
export function criarDesafio() {
  const a = randomInt(2, 10);
  const b = randomInt(2, 10);
  const nonce = randomInt(0, 2 ** 31).toString(36);
  const carga = Buffer.from(JSON.stringify({ r: assinar(`${a + b}:${nonce}`), n: nonce, t: Date.now() })).toString('base64url');
  return { pergunta: `Quanto é ${NOMES[a]} mais ${NOMES[b]}?`, token: `${carga}.${assinar(carga)}` };
}

export function conferirDesafio(token: unknown, resposta: unknown): boolean {
  if (typeof token !== 'string' || !segredo()) return false;
  const [carga, sig] = token.split('.');
  if (!carga || !sig) return false;
  const esperado = Buffer.from(assinar(carga));
  const recebido = Buffer.from(sig);
  if (esperado.length !== recebido.length || !timingSafeEqual(esperado, recebido)) return false;
  try {
    const c = JSON.parse(Buffer.from(carga, 'base64url').toString()) as { r: string; n: string; t: number };
    const idade = Date.now() - c.t;
    if (idade < ESPERA_MIN_MS || idade > MINUTOS * 60_000) return false;
    const n = Number(String(resposta).trim());
    return Number.isInteger(n) && assinar(`${n}:${c.n}`) === c.r;
  } catch {
    return false;
  }
}
