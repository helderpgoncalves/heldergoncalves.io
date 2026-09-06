/* ─────────────────────────────────────────────────────────────
   O site a funcionar com internet má — ou nenhuma.

   Regras, por ordem de importância:
   1. Nada de API. `/api/` e `/mcp` nunca passam por aqui.
   2. As páginas vão primeiro à rede, com um limite de 3,5 s. Se a rede
      falhar ou demorar, serve-se a última versão guardada. Assim um
      deploy aparece logo e um comboio sem rede continua a mostrar o site.
   3. Os ficheiros com hash no nome (/_astro/) e os tipos de letra são
      imutáveis: primeiro a cache, e a rede só se faltarem.
   ───────────────────────────────────────────────────────────── */
const VERSION = 'hg-1';
const PAGES = VERSION + '-paginas';
const ASSETS = VERSION + '-ficheiros';
const TIMEOUT = 3500;

self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((names) => Promise.all(names.filter((n) => n.indexOf(VERSION) !== 0).map((n) => caches.delete(n))))
      .then(() => self.clients.claim())
  );
});

const immutable = (url) => url.pathname.startsWith('/_astro/') || url.pathname.startsWith('/fonts/');

async function fromNetworkFirst(request) {
  const cache = await caches.open(PAGES);
  try {
    const network = await Promise.race([
      fetch(request),
      new Promise((_, reject) => setTimeout(() => reject(new Error('lento')), TIMEOUT)),
    ]);
    if (network && network.ok) cache.put(request, network.clone());
    return network;
  } catch (_) {
    const hit = await cache.match(request);
    if (hit) return hit;
    const home = await cache.match('/');
    if (home) return home;
    return new Response(
      '<!doctype html><meta charset="utf-8"><title>Sem rede</title>' +
        '<body style="font:16px -apple-system,system-ui,sans-serif;padding:3rem;max-width:32rem;margin:auto">' +
        '<h1>Sem rede</h1><p>Esta página ainda não tinha sido visitada. Assim que houver ligação, volta a funcionar.</p>',
      { status: 503, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
    );
  }
}

async function fromCacheFirst(request) {
  const cache = await caches.open(ASSETS);
  const hit = await cache.match(request);
  if (hit) return hit;
  const network = await fetch(request);
  if (network && network.ok) cache.put(request, network.clone());
  return network;
}

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith('/api/') || url.pathname === '/mcp' || url.pathname === '/sw.js') return;

  if (request.mode === 'navigate' || (request.headers.get('accept') || '').includes('text/html')) {
    event.respondWith(fromNetworkFirst(request));
    return;
  }
  if (immutable(url) || /\.(css|js|svg|png|jpg|jpeg|webp|avif|ico|woff2)$/.test(url.pathname)) {
    event.respondWith(fromCacheFirst(request));
  }
});
