// Verifica o SEO do site de ponta a ponta, a partir do sitemap.xml.
//
//   npm run verificar                              # contra o dev (http://127.0.0.1:3100)
//   npm run verificar -- https://heldergoncalves.io   # contra produção
//
// O sitemap usa sempre o domínio canónico; ao verificar noutro endereço, cada URL é lida desse endereço.
// Sai com código 1 se alguma verificação falhar (os avisos não falham).
import { artigos } from '../lib/md.mjs';

const CANON = 'https://heldergoncalves.io';
const base = (process.argv[2] ?? 'http://127.0.0.1:3100').replace(/\/$/, '');
const local = (u) => u.replace(CANON, base);
let falhas = 0, avisos = 0, ok = 0;
const bom = () => { ok++; };
const mau = (m) => { falhas++; console.log(`  ✗ ${m}`); };
const aviso = (m) => { avisos++; console.log(`  ! ${m}`); };
const verifica = (cond, m) => (cond ? bom() : mau(m));

const get = (u, opcoes = {}) => fetch(u, { redirect: 'manual', signal: AbortSignal.timeout(20_000), ...opcoes });
const atr = (tag, nome) => tag.match(new RegExp(`${nome}="([^"]*)"`))?.[1];

console.log(`A verificar ${base}\n`);

/* ---------- sitemap.xml ---------- */
const r = await get(`${base}/sitemap.xml`);
const xml = await r.text();
console.log('sitemap.xml');
verifica(r.status === 200 && /xml/.test(r.headers.get('content-type') ?? ''), `estado ${r.status} / tipo ${r.headers.get('content-type')}`);
verifica(xml.startsWith('<?xml') && xml.includes('<urlset') && xml.trimEnd().endsWith('</urlset>'), 'XML mal formado (cabeçalho ou <urlset>)');

const entradas = [...xml.matchAll(/<url>([\s\S]*?)<\/url>/g)].map((m) => {
  const b = m[1];
  return {
    loc: b.match(/<loc>([^<]+)<\/loc>/)?.[1],
    lastmod: b.match(/<lastmod>([^<]+)<\/lastmod>/)?.[1],
    alt: Object.fromEntries([...b.matchAll(/<xhtml:link\s+([^>]*?)\/?>/g)].map((x) => [atr(x[1], 'hreflang'), atr(x[1], 'href')])),
  };
});
verifica(entradas.length > 0 && entradas.length <= 50_000, `${entradas.length} URLs (limite: 50 000)`);
const locs = new Set(entradas.map((e) => e.loc));
verifica(locs.size === entradas.length, 'há <loc> repetidos');

/* ---------- cada URL ---------- */
for (const e of entradas) {
  console.log(`\n${e.loc.replace(CANON, '') || '/'}`);
  verifica(e.loc.startsWith(`${CANON}`) && !e.loc.endsWith('/') || e.loc === `${CANON}/`, `loc fora do domínio canónico: ${e.loc}`);
  if (e.lastmod) verifica(/^\d{4}-\d{2}-\d{2}/.test(e.lastmod) && Date.parse(e.lastmod) <= Date.now() + 864e5, `lastmod inválido ou no futuro: ${e.lastmod}`);

  // hreflang no sitemap: válido, com a própria página, com x-default, e recíproco.
  const codigos = Object.keys(e.alt);
  verifica(codigos.every((c) => /^(x-default|[a-z]{2,3}(-[A-Z]{2})?)$/.test(c)), `código hreflang inválido: ${codigos}`);
  const eu = codigos.find((c) => e.alt[c] === e.loc && c !== 'x-default');
  verifica(Boolean(eu), 'não se refere a si própria no hreflang');
  verifica('x-default' in e.alt, 'falta x-default');
  for (const [c, href] of Object.entries(e.alt)) {
    verifica(locs.has(href), `hreflang ${c} aponta para um URL que não está no sitemap: ${href}`);
    const par = entradas.find((x) => x.loc === href);
    if (par && c !== 'x-default') verifica(Object.values(par.alt).includes(e.loc), `${href} não aponta de volta para ${e.loc}`);
  }

  // A página real tem de concordar com o sitemap.
  const p = await get(local(e.loc));
  verifica(p.status === 200, `estado ${p.status} (esperava 200, sem redireccionar)`);
  const h = await p.text();
  const canonical = h.match(/<link rel="canonical" href="([^"]+)"/)?.[1];
  verifica(canonical === e.loc || canonical + '/' === e.loc || canonical === e.loc.replace(/\/$/, ''), `canonical diferente do sitemap: ${canonical}`);
  verifica(!/<meta name="robots" content="[^"]*noindex/.test(h), 'tem noindex mas está no sitemap');
  verifica(h.match(/<html[^>]*\slang="([^"]+)"/)?.[1] === eu, `<html lang> (${h.match(/<html[^>]*\slang="([^"]+)"/)?.[1]}) ≠ hreflang da página (${eu})`);
  const noHtml = Object.fromEntries([...h.matchAll(/<link rel="alternate" hrefLang="([^"]+)" href="([^"]+)"/g)].map((x) => [x[1], x[2]]));
  const norm = (o) => JSON.stringify(Object.entries(o).map(([k, v]) => [k, v.replace(/\/$/, '')]).sort());
  verifica(norm(noHtml) === norm(e.alt), `hreflang do HTML ≠ sitemap (${Object.keys(noHtml)} vs ${codigos})`);
  verifica((h.match(/<h1[\s>]/g) ?? []).length === 1, `deve haver exactamente um <h1> (há ${(h.match(/<h1[\s>]/g) ?? []).length})`);
  const titulo = h.match(/<title>([^<]+)<\/title>/)?.[1] ?? '';
  const desc = h.match(/<meta name="description" content="([^"]*)"/)?.[1] ?? '';
  verifica(titulo.length > 0, 'sem <title>');
  verifica(desc.length > 0, 'sem meta description');
  if (titulo.length > 70) aviso(`título com ${titulo.length} caracteres (o Google corta por volta dos 60)`);
  if (desc.length < 50 || desc.length > 180) aviso(`descrição com ${desc.length} caracteres (ideal 70–160)`);
  verifica(/<meta property="og:image" content="https:\/\/[^"]+"/.test(h) && /<meta name="twitter:card"/.test(h), 'falta og:image ou twitter:card');
  const ld = [...h.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)];
  verifica(ld.every((m) => { try { JSON.parse(m[1]); return true; } catch { return false; } }), 'JSON-LD inválido');
}

/* ---------- cobertura: tudo o que está publicado está no sitemap, e só isso ---------- */
console.log('\ncobertura');
for (const lang of ['pt', 'en']) {
  for (const a of artigos(lang)) {
    const url = `${CANON}${lang === 'pt' ? '/blog/' : '/en/blog/'}${a.slug}`;
    verifica(locs.has(url), `artigo publicado fora do sitemap: ${url}`);
  }
}
verifica(![...locs].some((l) => /\/(confirmar|confirm)$/.test(l)), 'páginas privadas (confirmação) estão no sitemap');

/* ---------- robots, feeds e URLs antigos ---------- */
console.log('\nrobots.txt, feeds, redirects');
const robots = await (await get(`${base}/robots.txt`)).text();
verifica(robots.includes(`Sitemap: ${CANON}/sitemap.xml`), 'robots.txt não indica o sitemap');
verifica(/Disallow: \/api\//.test(robots), 'robots.txt devia bloquear /api/');
for (const feed of ['/blog/feed.xml', '/en/blog/feed.xml']) {
  const f = await get(base + feed); const t = await f.text();
  verifica(f.status === 200 && t.includes('<rss'), `${feed} não responde com RSS`);
  const links = [...t.matchAll(/<item>[\s\S]*?<link>([^<]+)<\/link>/g)].map((m) => m[1]);
  verifica(links.every((l) => locs.has(l)), `${feed}: itens fora do sitemap`);
}
for (const [de, para] of [['/escritos', '/blog'], ['/en/articles', '/en/blog'], ['/escritos/a-licao-amarga', '/blog/a-licao-amarga']]) {
  const x = await get(base + de);
  verifica(x.status === 308 && new URL(x.headers.get('location') ?? '', base).pathname === para, `${de} devia redirecionar (308) para ${para}`);
}

console.log(`\n${falhas === 0 ? '✓' : '✗'} ${ok} verificações certas, ${falhas} falhas, ${avisos} avisos`);
process.exit(falhas ? 1 : 0);
