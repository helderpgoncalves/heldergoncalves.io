import type { NextRequest } from 'next/server';
import { dentroDoLimite, ipDe, json, lerJson, origemPermitida } from '@/lib/api';
import { configurado, emailValido, enviarConfirmacao } from '@/lib/newsletter';
import type { Lang } from '@/lib/copy';

export async function POST(req: NextRequest) {
  if (!origemPermitida(req)) return json({ erro: 'origem' }, 403);

  const corpo = await lerJson(req);
  if ('estado' in corpo) return json({ erro: 'invalido' }, corpo.estado);
  const { email: bruto, lang: lingua, website } = corpo.dados;

  // Isco para robôs: um campo escondido que uma pessoa nunca preenche.
  if (typeof website === 'string' && website.trim() !== '') return json({ ok: true });

  const lang: Lang = lingua === 'en' ? 'en' : 'pt';
  const email = typeof bruto === 'string' ? bruto.trim().toLowerCase() : '';
  if (!emailValido(email)) return json({ erro: 'invalido' }, 400);

  if (!dentroDoLimite(`ip:${ipDe(req)}`, 6, 10 * 60_000) || !dentroDoLimite(`em:${email}`, 3, 60 * 60_000)) {
    return json({ erro: 'limite' }, 429);
  }
  if (!configurado(lang)) return json({ erro: 'indisponivel' }, 503);

  // Não revelamos se o e-mail já estava subscrito: a resposta é sempre a mesma.
  const enviado = await enviarConfirmacao(email, lang).catch(() => false);
  return enviado ? json({ ok: true }) : json({ erro: 'envio' }, 502);
}
