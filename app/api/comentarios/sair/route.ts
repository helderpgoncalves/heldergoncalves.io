import type { NextRequest } from 'next/server';
import { json, origemPermitida } from '@/lib/api';
import { COOKIE } from '@/lib/newsletter';

export async function POST(req: NextRequest) {
  if (!origemPermitida(req)) return json({ erro: 'origem' }, 403);
  const r = json({ ok: true });
  r.cookies.set(COOKIE, '', { httpOnly: true, path: '/', maxAge: 0 });
  return r;
}
