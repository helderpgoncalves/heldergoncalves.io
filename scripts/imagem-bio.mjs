// Fundo da página de bio para telemóvel: a mesma paisagem, mais suave (as barras finas do original
// desfocadas o suficiente para não vibrarem atrás do texto) e muito mais leve que o hero de ecrã grande.
import sharp from 'sharp';

for (const w of [640, 960]) {
  const base = () => sharp('fonte/hero.png').resize({ width: w * 2, kernel: 'lanczos3' }).blur(2.2).resize({ width: w, kernel: 'lanczos3' }).modulate({ brightness: 0.96 });
  await base().avif({ quality: 55, effort: 7 }).toFile(`public/img/hero-suave-${w}.avif`);
  await base().webp({ quality: 74, effort: 6 }).toFile(`public/img/hero-suave-${w}.webp`);
  await base().jpeg({ quality: 76, mozjpeg: true }).toFile(`public/img/hero-suave-${w}.jpg`);
  console.log('ok', w);
}
