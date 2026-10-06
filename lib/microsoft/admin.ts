import { createHash, timingSafeEqual } from 'node:crypto';
import type { NextRequest } from 'next/server';
import { dentroDoLimite, ipDe } from '@/lib/api';

const resumo = (s: string) => createHash('sha256').update(s).digest();

/** Quem modera apresenta o MSFT_ADMIN_TOKEN (mínimo 24 caracteres). Sem token configurado, ninguém modera. */
export function eAdmin(req: NextRequest): boolean {
  const esperado = process.env.MSFT_ADMIN_TOKEN;
  if (!esperado || esperado.length < 24) return false;
  if (!dentroDoLimite(`admin:${ipDe(req)}`, 20, 10 * 60_000)) return false; // trava adivinhação
  const dado = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '') ?? '';
  return timingSafeEqual(resumo(dado), resumo(esperado));
}
