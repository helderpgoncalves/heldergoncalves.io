import { NextResponse, type NextRequest } from 'next/server';
import { appDe, subDe } from '@/lib/apps';

// Ficheiros que são do site todo e não de uma mini-app em particular.
const PARTILHADO = ['/_next/', '/api/health', '/img/', '/icon.png', '/favicon.ico', '/apple-icon.png', '/icon-192.png', '/icon-512.png', '/.well-known/'];
const naoExiste = (req: NextRequest) => NextResponse.rewrite(new URL('/__nao-existe', req.url));

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const sub = subDe(req.headers.get('host') ?? '');

  // O apex nunca serve as pastas das mini-apps directamente.
  if (!sub) return pathname === '/s' || pathname.startsWith('/s/') ? naoExiste(req) : NextResponse.next();

  if (!appDe(sub)) return naoExiste(req);
  if (PARTILHADO.some((p) => pathname === p || pathname.startsWith(p))) return NextResponse.next();

  const url = req.nextUrl.clone();
  url.pathname = `/s/${sub}${pathname === '/' ? '' : pathname}`;
  return NextResponse.rewrite(url);
}

export const config = { matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'] };
