import type { NextRequest } from 'next/server';
import { json, lerJson, origemPermitida } from '@/lib/api';
import { adicionarContacto, configurado, dentroDoLimite, lerToken } from '@/lib/newsletter';

// POST (e não GET): só uma pessoa a carregar no botão confirma. Um antivírus que
// abra o link do e-mail apenas vê a página, sem efeitos.
export async function POST(req: NextRequest) {
  if (!origemPermitida(req)) return json({ erro: 'origem' }, 403);

  const corpo = await lerJson(req);
  if ('estado' in corpo) return json({ erro: 'invalido' }, corpo.estado);

  const carga = lerToken(String(corpo.dados.t ?? ''));
  if (!carga) return json({ erro: 'invalido' }, 400);
  if (!dentroDoLimite(`conf:${carga.e}`, 10, 60 * 60_000)) return json({ erro: 'limite' }, 429);
  if (!configurado(carga.l)) return json({ erro: 'indisponivel' }, 503);

  const ok = await adicionarContacto(carga.e, carga.l).catch(() => false);
  return ok ? json({ ok: true, lang: carga.l }) : json({ erro: 'envio' }, 502);
}
