// ─────────────────────────────────────────────────────────────────────
// Servir o que o Astro gerou.
//
// As versões comprimidas vêm prontas do build (`scripts/precompress.mjs`
// escreve um `.br` e um `.gz` ao lado de cada ficheiro), por isso servir
// é ler bytes e mandá-los. Se não estiverem lá — a correr sem passar
// pelo build — comprime-se à mesma, uma vez, e guarda-se em memória:
// mais lento no primeiro pedido, mas nunca partido.
//
// Cada ficheiro é lido e etiquetado uma única vez e fica em memória. O
// que muda a cada pedido é só a escolha entre brotli, gzip e nada.
// ─────────────────────────────────────────────────────────────────────
import { readFile, stat } from 'node:fs/promises';
import { resolve, normalize, extname, sep, join } from 'node:path';
import { createHash } from 'node:crypto';
import { gzipSync, brotliCompressSync, constants as zlib } from 'node:zlib';
import { ROOT } from './config.mjs';
import { SECURITY } from './security.mjs';
import { send, text } from './http.mjs';

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.ico': 'image/x-icon',
  '.webmanifest': 'application/manifest+json',
  '.woff2': 'font/woff2',
  '.map': 'application/json; charset=utf-8',
};

const COMPRESSIBLE = /^(text\/|application\/(json|xml|manifest))/;

// ── A cache, com tecto ───────────────────────────────────────────────
// Guardar tudo o que já foi pedido é rápido e é uma fuga de memória com
// outro nome: basta o site crescer, ou alguém pedir todas as imagens por
// ordem, para o processo ficar a segurar o disco inteiro.
//
// Por isso há um orçamento em bytes e, quando ele estufa, sai o que há
// mais tempo não é pedido. O `Map` do JavaScript guarda a ordem de
// inserção, por isso apagar e voltar a pôr uma entrada em cada acerto dá
// o LRU de graça, sem estrutura nenhuma a mais.
const BUDGET = 24 * 1024 * 1024;

const cache = new Map();
let held = 0;

const weigh = (entry) =>
  entry.body.length + (entry.br ? entry.br.length : 0) + (entry.gzip ? entry.gzip.length : 0);

function remember(file, entry) {
  const size = weigh(entry);
  // Um ficheiro que sozinho não cabe no orçamento serve-se e esquece-se.
  if (size > BUDGET) return entry;
  cache.set(file, entry);
  held += size;
  for (const [oldest, victim] of cache) {
    if (held <= BUDGET) break;
    if (oldest === file) break;
    cache.delete(oldest);
    held -= weigh(victim);
  }
  return entry;
}

function recall(file) {
  const hit = cache.get(file);
  if (!hit) return null;
  // Volta para o fim da fila: é o que o torna o último a sair.
  cache.delete(file);
  cache.set(file, hit);
  return hit;
}

/** Resolve o pedido para um caminho dentro de ROOT — ou null. */
function safePath(pathname) {
  let decoded;
  try {
    decoded = decodeURIComponent(pathname);
  } catch (_) {
    return null;
  }
  if (decoded.indexOf('\u0000') !== -1) return null;
  const rel = normalize(decoded).replace(/^[/\\]+/, '');
  const full = resolve(ROOT, rel);
  if (full !== ROOT && !full.startsWith(ROOT + sep)) return null;
  return full;
}

/** A versão comprimida que o build deixou ao lado, se a deixou. */
async function sidecar(file, ext) {
  try {
    return await readFile(file + ext);
  } catch (_) {
    return null;
  }
}

export async function load(file) {
  const hit = recall(file);
  if (hit) return hit;

  const body = await readFile(file);
  const type = TYPES[extname(file).toLowerCase()] || 'application/octet-stream';
  const entry = {
    body,
    type,
    etag: '"' + createHash('sha1').update(body).digest('base64url').slice(0, 22) + '"',
    gzip: null,
    br: null,
  };

  if (COMPRESSIBLE.test(type) && body.length > 1024) {
    // O caminho normal: o build já comprimiu, e à qualidade máxima.
    entry.br = await sidecar(file, '.br');
    entry.gzip = await sidecar(file, '.gz');

    // O caminho de recurso: sem build, comprime-se aqui. Qualidade 10 e
    // não 11 porque agora há alguém à espera do outro lado.
    if (!entry.br && !entry.gzip) {
      entry.gzip = gzipSync(body, { level: 8 });
      try {
        entry.br = brotliCompressSync(body, {
          params: {
            [zlib.BROTLI_PARAM_QUALITY]: 10,
            [zlib.BROTLI_PARAM_SIZE_HINT]: body.length,
          },
        });
      } catch (_) {
        entry.br = null;
      }
    }
  }

  return remember(file, entry);
}

/**
 * Quanto tempo o browser pode guardar cada coisa. O que tem impressão
 * digital no nome guarda-se para sempre; o HTML nunca, porque é o
 * ficheiro que aponta para todos os outros.
 */
function cacheControl(urlPath, type) {
  if (urlPath === '/sw.js') return 'public, max-age=0, must-revalidate';
  if (urlPath.startsWith('/_astro/') || urlPath.startsWith('/fonts/')) return 'public, max-age=31536000, immutable';
  if (type.startsWith('text/html')) return 'public, max-age=0, must-revalidate';
  return 'public, max-age=3600';
}

async function serveFile(req, res, file, urlPath, status) {
  const code = status || 200;
  const entry = await load(file);
  const control = cacheControl(urlPath, entry.type);
  if (code === 200 && req.headers['if-none-match'] === entry.etag) {
    res.writeHead(304, Object.assign({}, SECURITY, { ETag: entry.etag, 'Cache-Control': control }));
    return res.end();
  }

  const accept = String(req.headers['accept-encoding'] || '');
  let body = entry.body;
  let encoding = null;
  if (entry.br && accept.indexOf('br') !== -1) {
    body = entry.br;
    encoding = 'br';
  } else if (entry.gzip && accept.indexOf('gzip') !== -1) {
    body = entry.gzip;
    encoding = 'gzip';
  }

  const headers = {
    'Content-Type': entry.type,
    'Cache-Control': control,
    ETag: entry.etag,
    Vary: 'Accept-Encoding',
    'Content-Length': String(body.length),
  };
  if (encoding) headers['Content-Encoding'] = encoding;
  res.writeHead(code, Object.assign({}, SECURITY, headers));
  if (req.method === 'HEAD') return res.end();
  res.end(body);
}

async function notFound(req, res) {
  try {
    return await serveFile(req, res, join(ROOT, '404.html'), '/404.html', 404);
  } catch (_) {
    return text(res, 404, 'Not found');
  }
}

/** Os ficheiros comprimidos acompanham o original; não se servem sozinhos. */
const SIDECAR = /\.(br|gz)$/i;

export async function handleStatic(req, res, url) {
  if (SIDECAR.test(url.pathname)) return notFound(req, res);

  const file = safePath(url.pathname);
  if (!file) return text(res, 400, 'Bad request');

  let info = null;
  try {
    info = await stat(file);
  } catch (_) {
    info = null;
  }

  if (info && info.isDirectory()) {
    if (!url.pathname.endsWith('/')) return send(res, 308, null, { Location: url.pathname + '/' + url.search });
    try {
      return await serveFile(req, res, join(file, 'index.html'), url.pathname);
    } catch (_) {
      return notFound(req, res);
    }
  }
  if (info && info.isFile()) return serveFile(req, res, file, url.pathname);

  // Sem extensão: o Astro gera `sobre.html` para `/sobre`.
  try {
    return await serveFile(req, res, file + '.html', url.pathname);
  } catch (_) {
    return notFound(req, res);
  }
}

/** Quantos bytes a cache está a segurar, e em quantos ficheiros. */
export const cacheStats = () => ({ files: cache.size, bytes: held });
