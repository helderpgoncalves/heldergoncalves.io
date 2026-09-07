// ─────────────────────────────────────────────────────────────────────
// Comprimir no build, não no primeiro pedido.
//
// Comprimir custa. Fazê-lo quando alguém pede o ficheiro significa que
// há sempre um visitante — o primeiro depois de cada deploy — a pagar a
// conta, e que o servidor gasta CPU a fazer repetidamente o mesmo
// trabalho sobre ficheiros que nunca mudam.
//
// Feito aqui, custa uma vez na vida do build e o servidor passa a
// entregar bytes já prontos. E como já não há pressa, o Brotli pode ir
// à qualidade 11 em vez da 10: mais uns três a cinco por cento de
// poupança que em tempo de pedido não compensariam.
//
// Zero dependências: só `node:zlib`.
// ─────────────────────────────────────────────────────────────────────
import { readdir, readFile, stat, writeFile } from 'node:fs/promises';
import { extname, join, resolve } from 'node:path';
import { brotliCompress, gzip, constants as zlib } from 'node:zlib';
import { promisify } from 'node:util';

const brotli = promisify(brotliCompress);
const gz = promisify(gzip);

const DIST = resolve(process.env.STATIC_DIR || './dist');

/** O que vale a pena comprimir. Imagens e tipos de letra já vêm comprimidos. */
const COMPRESSIBLE = new Set([
  '.html', '.css', '.js', '.mjs', '.json', '.txt', '.xml', '.svg', '.webmanifest', '.map',
]);

/** Abaixo disto, o cabeçalho da compressão custa mais do que poupa. */
const FLOOR = 1024;

/** Se comprimir não poupar pelo menos isto, não se guarda o ficheiro. */
const WORTH_IT = 0.95;

async function* walk(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) yield* walk(path);
    else if (entry.isFile()) yield path;
  }
}

async function compress(file, size) {
  const body = await readFile(file);
  const out = [];

  const br = await brotli(body, {
    params: {
      [zlib.BROTLI_PARAM_QUALITY]: zlib.BROTLI_MAX_QUALITY,
      [zlib.BROTLI_PARAM_SIZE_HINT]: body.length,
    },
  });
  if (br.length < size * WORTH_IT) {
    await writeFile(file + '.br', br);
    out.push(br.length);
  }

  // O gzip fica para quem não fala brotli. Praticamente ninguém, hoje,
  // mas custa pouco e é a diferença entre servir e não servir.
  const zip = await gz(body, { level: zlib.Z_BEST_COMPRESSION });
  if (zip.length < size * WORTH_IT) {
    await writeFile(file + '.gz', zip);
    out.push(zip.length);
  }

  return out.length ? Math.min(...out) : size;
}

async function main() {
  let files = 0;
  let before = 0;
  let after = 0;

  for await (const file of walk(DIST)) {
    const ext = extname(file).toLowerCase();
    if (!COMPRESSIBLE.has(ext)) continue;
    const { size } = await stat(file);
    if (size < FLOOR) continue;

    files += 1;
    before += size;
    after += await compress(file, size);
  }

  const kb = (n) => (n / 1024).toFixed(0) + ' KB';
  const saved = before ? Math.round((1 - after / before) * 100) : 0;
  console.log(`comprimidos ${files} ficheiros: ${kb(before)} → ${kb(after)} (−${saved}%)`);
}

main().catch((err) => {
  console.error('[precompress] ' + (err && err.message));
  process.exit(1);
});
