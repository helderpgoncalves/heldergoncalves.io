import { NextResponse, type NextRequest } from 'next/server';
import { SITE } from './site';

export const json = (corpo: object, status = 200) =>
  NextResponse.json(corpo, { status, headers: { 'Cache-Control': 'no-store' } });

const hostsPermitidos = new Set([SITE.url, SITE.canonico, SITE.alias].map((u) => new URL(u).host));
if (process.env.NODE_ENV !== 'production') ['localhost:3100', '127.0.0.1:3100'].forEach((h) => hostsPermitidos.add(h));

/** Só aceitamos pedidos feitos pelas nossas páginas: os browsers enviam sempre o Origin num POST. */
export function origemPermitida(req: NextRequest): boolean {
  try {
    return hostsPermitidos.has(new URL(req.headers.get('origin') ?? '').host);
  } catch {
    return false;
  }
}

/** Lê um corpo JSON pequeno. Devolve o estado HTTP certo quando não serve. */
export async function lerJson(req: NextRequest, maximo = 2048): Promise<{ dados: Record<string, unknown> } | { estado: 400 | 413 | 415 }> {
  if (!req.headers.get('content-type')?.toLowerCase().startsWith('application/json')) return { estado: 415 };
  if (Number(req.headers.get('content-length') ?? 0) > maximo) return { estado: 413 };
  const texto = await req.text();
  if (texto.length > maximo) return { estado: 413 };
  try {
    const dados: unknown = JSON.parse(texto);
    return dados && typeof dados === 'object' && !Array.isArray(dados) ? { dados: dados as Record<string, unknown> } : { estado: 400 };
  } catch {
    return { estado: 400 };
  }
}

/**
 * O IP de quem pede. Atrás de um proxy, o último endereço de x-forwarded-for é o que o proxy viu;
 * os anteriores vêm do cliente e podem ser inventados.
 */
export function ipDe(req: NextRequest): string {
  const real = req.headers.get('x-real-ip');
  if (real) return real.trim();
  return req.headers.get('x-forwarded-for')?.split(',').map((p) => p.trim()).filter(Boolean).at(-1) ?? 'desconhecido';
}
