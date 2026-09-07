// ─────────────────────────────────────────────────────────────────────
// Aquecer a cache no arranque.
//
// Sem isto, o primeiro visitante depois de cada deploy paga a leitura de
// cada ficheiro que toca — a página, o CSS, o JS, e as duas versões
// comprimidas de cada um. É pouco, mas é sempre no pior momento: logo a
// seguir a um deploy, quando alguém está a ver se ficou bem.
//
// Corre depois de o servidor já estar a atender, e não bloqueia nada. Se
// falhar, falha em silêncio: é uma optimização, não um requisito.
// ─────────────────────────────────────────────────────────────────────
import { readdir } from 'node:fs/promises';
import { extname, join } from 'node:path';
import { ROOT } from './config.mjs';
import { load } from './static.mjs';

/** O que vale a pena ter pronto: o que uma página precisa para pintar. */
const WARM = new Set(['.html', '.css', '.js', '.mjs']);

/** Tectos, para o arranque não crescer sem limite num site que cresça. */
const MAX_FILES = 120;
const MAX_BYTES = 24 * 1024 * 1024;

async function* walk(dir) {
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch (_) {
    return;
  }
  for (const entry of entries) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) yield* walk(path);
    else if (entry.isFile()) yield path;
  }
}

export async function warmCache() {
  let files = 0;
  let bytes = 0;
  const started = Date.now();

  for await (const file of walk(ROOT)) {
    if (files >= MAX_FILES || bytes >= MAX_BYTES) break;
    if (!WARM.has(extname(file).toLowerCase())) continue;
    try {
      const entry = await load(file);
      files += 1;
      bytes += entry.body.length;
    } catch (_) {
      /* um ficheiro que não abre não estraga o arranque */
    }
  }

  if (files) {
    console.log('cache:      ' + files + ' ficheiros prontos em ' + (Date.now() - started) + ' ms');
  }
}
