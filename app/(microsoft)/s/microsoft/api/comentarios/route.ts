import type { NextRequest } from 'next/server';
import { dentroDoLimite, ipDe, json, lerJson, origemPermitida } from '@/lib/api';
import { adicionar, repetido, validar } from '@/lib/microsoft/comentarios';
import { novoComentario } from '@/lib/microsoft/tempo-real';

export async function POST(req: NextRequest) {
  if (!origemPermitida(req)) return json({ erro: 'origem' }, 403);

  const corpo = await lerJson(req);
  if ('estado' in corpo) return json({ erro: 'invalido' }, corpo.estado);

  // Isco para robôs: um campo escondido que uma pessoa nunca preenche.
  if (typeof corpo.dados.website === 'string' && corpo.dados.website.trim() !== '') return json({ ok: true });

  const v = validar(corpo.dados.nome, corpo.dados.texto, corpo.dados.avatar, corpo.dados.cor);
  if ('erro' in v) return json({ erro: v.erro }, 400);

  const ip = ipDe(req);
  if (!dentroDoLimite(`com20:${ip}`, 1, 20_000) || !dentroDoLimite(`com:${ip}`, 5, 10 * 60_000)) return json({ erro: 'limite' }, 429);
  if (await repetido(v.nome, v.texto)) return json({ erro: 'repetido' }, 409);

  try {
    const { comentario, segredo } = await adicionar(v.nome, v.texto, v.avatar, v.cor);
    novoComentario(comentario);
    // O segredo só sai agora: com ele, e só com ele, o autor pode apagar a mensagem.
    return json({ ok: true, comentario, segredo }, 201);
  } catch (e) {
    console.error(`[microsoft] não consegui guardar o comentário: ${e instanceof Error ? e.message : e}`);
    return json({ erro: 'indisponivel' }, 503);
  }
}
