import { NextResponse, type NextRequest } from 'next/server';

// Ficheiros do site todo, que a página de bio também usa.
const PARTILHADO = ['/_next/', '/api/health', '/api/contacto', '/img/', '/icon.png', '/favicon.ico', '/apple-icon.png', '/icon-192.png', '/icon-512.png', '/.well-known/'];
// bio.heldergoncalves.io (e bio.localhost em desenvolvimento) serve a pasta app/(bio)/s/bio/.
const ehBio = (host: string) => ['bio.heldergoncalves.io', 'bio.localhost'].includes(host.split(':')[0].toLowerCase());
const naoExiste = (req: NextRequest) => NextResponse.rewrite(new URL('/__nao-existe', req.url));

// Só quando o Markdown é preferido ao HTML (o `q` mais alto), não quando aparece num */* qualquer.
function pedeMarkdown(req: NextRequest) {
  const accept = req.headers.get('accept') ?? '';
  const q = (tipo: string) => { const m = accept.split(',').map((p) => p.trim()).find((p) => p.split(';')[0].trim() === tipo); return m ? Number(m.match(/q=([\d.]+)/)?.[1] ?? 1) : -1; };
  return q('text/markdown') > 0 && q('text/markdown') >= q('text/html');
}

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const bio = ehBio(req.headers.get('host') ?? '');

  // O domínio principal nunca serve a pasta da bio directamente.
  if (!bio) {
    if (pathname === '/s' || pathname.startsWith('/s/')) return naoExiste(req);
    // Quem pede Markdown (agentes de IA) recebe a mesma página em Markdown.
    if (pedeMarkdown(req) && /^(\/(en)?|\/(en\/)?blog(\/[a-z0-9-]+)?)$/.test(pathname)) {
      const url = req.nextUrl.clone();
      url.pathname = `/md${pathname === '/' ? '' : pathname}`;
      return NextResponse.rewrite(url);
    }
    return NextResponse.next();
  }

  if (PARTILHADO.some((p) => pathname === p || pathname.startsWith(p))) return NextResponse.next();

  const url = req.nextUrl.clone();
  url.pathname = `/s/bio${pathname === '/' ? '' : pathname}`;
  return NextResponse.rewrite(url);
}

export const config = { matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'] };
