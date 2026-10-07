import type { NextRequest } from 'next/server';
import { dentroDoLimite, ipDe, json, lerJson, origemPermitida } from '@/lib/api';
import { configurado, eSubscritor, emailValido, enviarEntrada } from '@/lib/newsletter';
import type { Lang } from '@/lib/copy';

// «Já subscrevi, quero comentar»: se o e-mail estiver subscrito, recebe uma ligação que abre a sessão.
// A resposta é sempre a mesma, para ninguém descobrir quem está (ou não) na lista.
export async function POST(req: NextRequest) {
  if (!origemPermitida(req)) return json({ erro: 'origem' }, 403);
  const corpo = await lerJson(req);
  if ('estado' in corpo) return json({ erro: 'invalido' }, corpo.estado);
  const email = typeof corpo.dados.email === 'string' ? corpo.dados.email.trim().toLowerCase() : '';
  const lang: Lang = corpo.dados.lang === 'en' ? 'en' : 'pt';
  if (!emailValido(email)) return json({ erro: 'invalido' }, 400);
  if (!dentroDoLimite(`ent-ip:${ipDe(req)}`, 8, 10 * 60_000) || !dentroDoLimite(`ent:${email}`, 3, 60 * 60_000)) return json({ erro: 'limite' }, 429);
  if (!configurado(lang)) return json({ erro: 'indisponivel' }, 503);
  if (await eSubscritor(email)) await enviarEntrada(email, lang).catch(() => false);
  return json({ ok: true });
}
