import type { NextRequest } from 'next/server';
import { dentroDoLimite, ipDe, json, lerJson, origemPermitida } from '@/lib/api';
import { conferirDesafio, contactoConfigurado, numero } from '@/lib/contacto';
import { emailValido } from '@/lib/newsletter';

// O e-mail só serve de porta (um pouco de atrito para robôs e curiosos): não se guarda nem se envia a lado nenhum.
export async function POST(req: NextRequest) {
  if (!origemPermitida(req)) return json({ erro: 'origem' }, 403);
  const corpo = await lerJson(req);
  if ('estado' in corpo) return json({ erro: 'invalido' }, corpo.estado);
  const { email: bruto, resposta, token, website } = corpo.dados;

  if (typeof website === 'string' && website.trim() !== '') return json({ erro: 'desafio' }, 400); // isco para robôs
  const email = typeof bruto === 'string' ? bruto.trim().toLowerCase() : '';
  if (!emailValido(email)) return json({ erro: 'invalido' }, 400);
  if (!contactoConfigurado()) return json({ erro: 'indisponivel' }, 503);
  if (!dentroDoLimite(`contacto:${ipDe(req)}`, 8, 10 * 60_000)) return json({ erro: 'limite' }, 429);
  if (!conferirDesafio(token, resposta)) return json({ erro: 'desafio' }, 400);

  return json({ whatsapp: `https://wa.me/${numero()}` });
}
