// Gera, uma vez, todas as versões da imagem a partir do original (fonte/hero.png).
// O padrão de barras do original é fino: AVIF e JPEG saem em 4:4:4, para a cor
// não "sangrar" entre linhas, e a largura máxima é a do próprio original.
import sharp from 'sharp';
import { mkdir } from 'node:fs/promises';

const fonte = 'fonte/hero.png';
const saida = 'public/img';
const larguras = [1280, 2048, 3072, 4096];

await mkdir(saida, { recursive: true });
const { width, height } = await sharp(fonte).metadata();
console.log(`original: ${width}×${height}`);

for (const w of larguras) {
  const base = () => sharp(fonte).resize({ width: Math.min(w, width), kernel: 'lanczos3' });
  await base().avif({ quality: 72, effort: 7, chromaSubsampling: '4:4:4' }).toFile(`${saida}/hero-${w}.avif`);
  await base().webp({ quality: 92, effort: 6, smartSubsample: true }).toFile(`${saida}/hero-${w}.webp`);
  await base().jpeg({ quality: 92, mozjpeg: true, chromaSubsampling: '4:4:4' }).toFile(`${saida}/hero-${w}.jpg`);
  console.log('ok', w);
}

// Cartão de partilha 1200×630, enquadrado na figura (a 44% / 66% do original).
const alvoH = Math.round((width * 630) / 1200);
const topo = Math.max(0, Math.min(height - alvoH, Math.round(height * 0.66 - alvoH / 2)));
await sharp(fonte)
  .extract({ left: 0, top: topo, width, height: alvoH })
  .resize(1200, 630, { kernel: 'lanczos3' })
  .jpeg({ quality: 90, mozjpeg: true })
  .toFile('public/og.jpg');

console.log('og.jpg ok (o ícone é gerado por `npm run icone`)');
