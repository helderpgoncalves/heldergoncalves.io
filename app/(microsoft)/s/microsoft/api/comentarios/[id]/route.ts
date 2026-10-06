import type { NextRequest } from 'next/server';
import { dentroDoLimite, ipDe, json, origemPermitida } from '@/lib/api';
import { eAdmin } from '@/lib/microsoft/admin';
import { eAutor, remover } from '@/lib/microsoft/comentarios';
import { hub } from '@/lib/microsoft/tempo-real';

// Apagar: o moderador (token de administrador) ou o próprio autor (o segredo recebido ao escrever).
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!origemPermitida(req)) return json({ erro: 'origem' }, 403);
  const { id } = await params;

  const segredo = req.headers.get('x-segredo') ?? '';
  let autorizado = false;
  if (segredo) {
    if (!dentroDoLimite(`seg:${ipDe(req)}`, 30, 10 * 60_000)) return json({ erro: 'limite' }, 429);
    autorizado = await eAutor(id, segredo);
  } else {
    autorizado = eAdmin(req);
  }
  if (!autorizado) return json({ erro: 'nao-autorizado' }, 401);

  if (!(await remover(id))) return json({ erro: 'nao-existe' }, 404);
  hub.emitir({ tipo: 'removido', dados: { id } });
  return json({ ok: true });
}
