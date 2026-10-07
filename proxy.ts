import { NextResponse, type NextRequest } from 'next/server';
import { appDe, subDe } from '@/lib/apps';

// Ficheiros que são do site todo e não de uma mini-app em particular.
const PARTILHADO = ['/_next/', '/api/health', '/img/', '/icon.png', '/favicon.ico', '/apple-icon.png', '/icon-192.png', '/icon-512.png', '/.well-known/'];
const naoExiste = (req: NextRequest) => NextResponse.rewrite(new URL('/__nao-existe', req.url));

// Só quando o Markdown é preferido ao HTML (o `q` mais alto), não quando aparece num */* qualquer.
function pedeMarkdown(req: NextRequest) {
  const accept = req.headers.get('accept') ?? '';
  const q = (tipo: string) => { const m = accept.split(',').map((p) => p.trim()).find((p) => p.split(';')[0].trim() === tipo); return m ? Number(m.match(/q=([\d.]+)/)?.[1] ?? 1) : -1; };
  return q('text/markdown') > 0 && q('text/markdown') >= q('text/html');
}

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const sub = subDe(req.headers.get('host') ?? '');

  // O apex nunca serve as pastas das mini-apps directamente.
  if (!sub) {
    if (pathname === '/s' || pathname.startsWith('/s/')) return naoExiste(req);
    // Quem pede Markdown (agentes de IA) recebe a mesma página em Markdown.
    if (pedeMarkdown(req) && /^(\/(en)?|\/(en\/)?blog(\/[a-z0-9-]+)?)$/.test(pathname)) {
      const url = req.nextUrl.clone();
      url.pathname = `/md${pathname === '/' ? '' : pathname}`;
      return NextResponse.rewrite(url);
    }
    return NextResponse.next();
  }

  if (!appDe(sub)) return naoExiste(req);
  if (PARTILHADO.some((p) => pathname === p || pathname.startsWith(p))) return NextResponse.next();

  const url = req.nextUrl.clone();
  url.pathname = `/s/${sub}${pathname === '/' ? '' : pathname}`;
  return NextResponse.rewrite(url);
}

export const config = { matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'] };
