import { NextResponse, type NextRequest } from 'next/server';
import { appDe, subDe } from './apps';
import { SITE } from './site';

export const json = (corpo: object, status = 200) =>
  NextResponse.json(corpo, { status, headers: { 'Cache-Control': 'no-store' } });

const hostsPermitidos = new Set([SITE.url, SITE.canonico, SITE.alias].map((u) => new URL(u).host));
if (process.env.NODE_ENV !== 'production') ['localhost:3100', '127.0.0.1:3100'].forEach((h) => hostsPermitidos.add(h));

/** Só aceitamos pedidos feitos pelas nossas páginas (e pelas mini-apps activas): os browsers enviam sempre o Origin num POST. */
export function origemPermitida(req: NextRequest): boolean {
  try {
    const host = new URL(req.headers.get('origin') ?? '').host;
    const sub = subDe(host);
    return hostsPermitidos.has(host) || Boolean(sub && appDe(sub));
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
 * O IP de quem pede. Atrás do Cloudflare, o IP verdadeiro vem em cf-connecting-ip (sem isto, todos os
 * visitantes pareceriam ter o IP do Cloudflare e partilhariam o mesmo limite). Quem fale directo com o
 * servidor pode inventá-lo, mas isso só lhe dá limites à parte, não acesso a nada.
 * Sem Cloudflare: o último endereço de x-forwarded-for é o que o proxy viu; os anteriores podem ser inventados.
 */
export function ipDe(req: NextRequest): string {
  const cf = req.headers.get('cf-connecting-ip');
  if (cf) return cf.trim();
  const real = req.headers.get('x-real-ip');
  if (real) return real.trim();
  return req.headers.get('x-forwarded-for')?.split(',').map((p) => p.trim()).filter(Boolean).at(-1) ?? 'desconhecido';
}

/** Limite de pedidos por chave, em memória: trava abusos óbvios, não é um sistema de quotas. */
const g = globalThis as { __janelas?: Map<string, number[]> };
const janelas = (g.__janelas ??= new Map<string, number[]>());
export function dentroDoLimite(chave: string, max: number, ms: number): boolean {
  const agora = Date.now();
  const lista = (janelas.get(chave) ?? []).filter((t) => agora - t < ms);
  if (lista.length >= max) { janelas.set(chave, lista); return false; }
  lista.push(agora);
  janelas.set(chave, lista);
  if (janelas.size > 5000) for (const [k, v] of janelas) if (!v.some((t) => agora - t < ms)) janelas.delete(k);
  return true;
}
