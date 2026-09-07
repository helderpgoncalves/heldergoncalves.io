// ─────────────────────────────────────────────────────────────────────
// Os PNG do ícone, gerados no build a partir de public/favicon.svg.
//
// O SVG chega a todo o lado onde um SVG serve: o separador do browser,
// o manifesto. Mas o Safari não aceita SVG no ícone de Safari nem o
// iOS no ecrã principal, e a PWA no Android quer PNG a 192 e a 512.
// Em vez de manter cinco desenhos iguais, há um só — o SVG — e este
// script rasteriza-o uma vez, no build, com o sharp que o Astro já
// usa para as imagens. Em produção não se calcula nada (invariante 8).
//
// Saem duas famílias:
//   · «recortado» — com os cantos contínuos e o resto transparente. É o
//     que vai para o separador e para o manifesto com purpose "any".
//   · «cheio» — o quadrado inteiro, sem recorte. É o que o iOS pede
//     para o apple-touch-icon e o Android para "maskable": são eles
//     que aplicam a máscara, e o ícone tem de encher o quadrado.
// O «cheio» é o mesmo SVG sem o clip-path de fora, e mais nada.
// ─────────────────────────────────────────────────────────────────────
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import sharp from 'sharp';

const DIST = resolve(process.env.STATIC_DIR || './dist');
const FONTE = resolve('./public/favicon.svg');
const LADO = 1024;

/** Tamanho, ficheiro, e se é o quadrado cheio ou o recortado. */
const SAIDAS = [
  { size: 32, file: 'favicon-32.png', cheio: false },
  { size: 180, file: 'apple-touch-icon.png', cheio: true },
  { size: 192, file: 'icone-192.png', cheio: false },
  { size: 512, file: 'icone-512.png', cheio: false },
  { size: 192, file: 'icone-maskable-192.png', cheio: true },
  { size: 512, file: 'icone-maskable-512.png', cheio: true },
];

async function main() {
  const svg = await readFile(FONTE, 'utf8');
  const recorte = ' clip-path="url(#sq)"';
  if (!svg.includes(recorte)) throw new Error('o favicon.svg já não tem o recorte de fora');
  const cheio = svg.replace(recorte, '');

  for (const { size, file, cheio: semRecorte } of SAIDAS) {
    // A densidade faz o rasterizador desenhar logo ao tamanho certo,
    // em vez de desenhar a 1024 e reduzir: as linhas finas saem limpas.
    const density = (72 * size) / LADO;
    const png = await sharp(Buffer.from(semRecorte ? cheio : svg), { density })
      .resize(size, size)
      .png({ compressionLevel: 9 })
      .toBuffer();
    await writeFile(resolve(DIST, file), png);
  }
  console.log(`ícones: ${SAIDAS.length} PNG a partir do favicon.svg`);
}

main().catch((err) => {
  console.error('[icones] ' + (err && err.message));
  process.exit(1);
});
