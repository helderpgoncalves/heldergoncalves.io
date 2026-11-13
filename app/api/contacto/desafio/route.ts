import type { NextRequest } from 'next/server';
import { dentroDoLimite, ipDe, json } from '@/lib/api';
import { contactoConfigurado, criarDesafio } from '@/lib/contacto';

export const dynamic = 'force-dynamic'; // aleatório e depende do ambiente: nunca se gera no build

export function GET(req: NextRequest) {
  if (!contactoConfigurado()) return json({ erro: 'indisponivel' }, 503);
  if (!dentroDoLimite(`desafio:${ipDe(req)}`, 20, 10 * 60_000)) return json({ erro: 'limite' }, 429);
  return json(criarDesafio());
}
