// Prepara a imagem do blog (fonte/blog-ascii.png): a versão em ASCII (lib/ascii.ts), as versões
// reais em AVIF, WebP e JPEG (public/img/blog-hero-*) e o cartão de partilha do blog (public/img/blog-og.jpg).
//   npm run ascii
import sharp from 'sharp';
import { mkdir, writeFile } from 'node:fs/promises';

const fonte = 'fonte/blog-ascii.png';
// Do vazio para o cheio: sem hífens, sem sinais agressivos. O brilho da imagem vira "tinta".
const rampa = ' .·:;+xX%#@'.split('');

async function ascii(colunas, recorte) {
  const { width, height } = await sharp(fonte).metadata();
  let img = sharp(fonte);
  let w = width, h = height;
  if (recorte) { img = img.extract(recorte); w = recorte.width; h = recorte.height; }
  // A célula de uma letra é cerca de duas vezes mais alta do que larga.
  const linhas = Math.round((colunas * (h / w)) / 2);
  // Reduz de uma vez só e dá contraste local (sharpen com raio largo) para a figura, os raios e as cristas se verem.
  const { data } = await img
    .resize(colunas * 2, linhas * 2, { fit: 'fill', kernel: 'lanczos3' })
    .greyscale()
    .sharpen({ sigma: 3, m1: 0, m2: 2 })
    .resize(colunas, linhas, { kernel: 'lanczos3', fit: 'fill' })
    .normalise({ lower: 1, upper: 99 })
    .gamma(1.35)
    .raw()
    .toBuffer({ resolveWithObject: true });
  const rows = [];
  for (let y = 0; y < linhas; y++) {
    let r = '';
    // O céu, muito brilhante, vira uma mancha: suaviza-se nos primeiros terços para as formas do vale aparecerem.
    const fade = 0.5 + 0.5 * Math.min(1, y / (linhas * 0.45));
    for (let x = 0; x < colunas; x++) r += rampa[Math.min(rampa.length - 1, Math.floor(((data[y * colunas + x] * fade) / 256) * rampa.length))];
    rows.push(r.trimEnd());
  }
  return rows.join('\n');
}

const largo = await ascii(140, { left: 0, top: 420, width: 4096, height: 2311 });
const estreito = await ascii(56, { left: 0, top: 300, width: 3500, height: 2300 });
await writeFile('lib/ascii.ts', `// Gerado por scripts/ascii.mjs a partir de fonte/blog-ascii.png. Não editar à mão.\nexport const ASCII = {\n  largo: ${JSON.stringify(largo)},\n  estreito: ${JSON.stringify(estreito)},\n} as const;\n`);

if (process.argv.includes('--so-ascii')) { console.log('ascii ok'); process.exit(0); }
await mkdir('public/img', { recursive: true });
for (const w of [1280, 2048]) {
  const base = () => sharp(fonte).resize({ width: w, kernel: 'lanczos3' }).blur(0.6);
  await base().avif({ quality: 55, effort: 6 }).toFile(`public/img/blog-hero-${w}.avif`);
  await base().webp({ quality: 78, effort: 5 }).toFile(`public/img/blog-hero-${w}.webp`);
  await base().jpeg({ quality: 80, mozjpeg: true }).toFile(`public/img/blog-hero-${w}.jpg`);
}
await sharp(fonte).resize(1200, 630, { fit: 'cover', position: sharp.strategy.attention }).blur(0.5).jpeg({ quality: 86, mozjpeg: true }).toFile('public/img/blog-og.jpg');
console.log(`ascii ok (${largo.split('\n').length} linhas largas, ${estreito.split('\n').length} estreitas), imagens ok`);
