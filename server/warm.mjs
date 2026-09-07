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

// Tectos apertados de propósito. Isto serve para a primeira página não
// esperar por disco, não para trazer o site todo para a memória — disso
// trata a cache, que tem o seu próprio orçamento e sabe deitar fora.
const MAX_FILES = 40;
const MAX_BYTES = 4 * 1024 * 1024;

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
    const kb = Math.round(bytes / 1024);
    console.log('cache:      ' + files + ' ficheiros, ' + kb + ' KB, em ' + (Date.now() - started) + ' ms');
  }
}
