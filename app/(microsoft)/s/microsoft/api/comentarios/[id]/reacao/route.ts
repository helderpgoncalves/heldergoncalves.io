import type { NextRequest } from 'next/server';
import { dentroDoLimite, ipDe, json, lerJson, origemPermitida } from '@/lib/api';
import { reagir } from '@/lib/microsoft/comentarios';
import { novaReacao } from '@/lib/microsoft/tempo-real';

// Liga ou desliga uma reacção. O "cliente" é um identificador anónimo que o browser gera e guarda:
// serve só para cada pessoa contar uma vez por reacção (não é uma conta).
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!origemPermitida(req)) return json({ erro: 'origem' }, 403);
  const corpo = await lerJson(req, 512);
  if ('estado' in corpo) return json({ erro: 'invalido' }, corpo.estado);

  const { emoji, cliente, ligar } = corpo.dados;
  if (typeof emoji !== 'string' || typeof cliente !== 'string' || !/^[a-f0-9-]{16,64}$/i.test(cliente) || typeof ligar !== 'boolean') {
    return json({ erro: 'invalido' }, 400);
  }
  if (!dentroDoLimite(`rea:${ipDe(req)}`, 60, 10 * 60_000)) return json({ erro: 'limite' }, 429);

  const { id } = await params;
  const reacoes = await reagir(id, emoji, cliente, ligar).catch(() => undefined);
  if (reacoes === undefined) return json({ erro: 'indisponivel' }, 503);
  if (reacoes === null) return json({ erro: 'nao-existe' }, 404);
  novaReacao(id, reacoes);
  return json({ ok: true, reacoes });
}
