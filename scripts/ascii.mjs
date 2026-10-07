// Prepara a imagem do blog (fonte/blog-ascii.png, que já é ASCII): as versões em AVIF, WebP e JPEG
// (public/img/blog-hero-*) e o cartão de partilha do blog (public/img/blog-og.jpg).
//   npm run ascii
import sharp from 'sharp';
import { mkdir } from 'node:fs/promises';

const fonte = 'fonte/blog-ascii.png';
await mkdir('public/img', { recursive: true });
for (const w of [1280, 2048]) {
  const base = () => sharp(fonte).resize({ width: w, kernel: 'lanczos3' }).blur(0.6);
  await base().avif({ quality: 55, effort: 6 }).toFile(`public/img/blog-hero-${w}.avif`);
  await base().webp({ quality: 78, effort: 5 }).toFile(`public/img/blog-hero-${w}.webp`);
  await base().jpeg({ quality: 80, mozjpeg: true }).toFile(`public/img/blog-hero-${w}.jpg`);
}
await sharp(fonte).resize(1200, 630, { fit: 'cover', position: sharp.strategy.attention }).blur(0.5).jpeg({ quality: 86, mozjpeg: true }).toFile('public/img/blog-og.jpg');
console.log('imagens do blog ok');
