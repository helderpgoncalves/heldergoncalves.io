import type { NextRequest } from 'next/server';
import { dentroDoLimite, json, lerJson, origemPermitida } from '@/lib/api';
import { COOKIE, adicionarContacto, configurado, criarSessao, lerSessao, lerToken } from '@/lib/newsletter';

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

  // Ligação para entrar nos comentários: abre a sessão, não toca na subscrição.
  if (carga.k === 'c') {
    const anterior = lerSessao(req.cookies.get(COOKIE)?.value);
    const { valor, segundos } = criarSessao(carga.e, anterior?.n);
    const r = json({ ok: true, lang: carga.l, comentar: true });
    r.cookies.set(COOKIE, valor, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/', maxAge: segundos });
    return r;
  }

  const ok = await adicionarContacto(carga.e, carga.l).catch(() => false);
  return ok ? json({ ok: true, lang: carga.l }) : json({ erro: 'envio' }, 502);
}
