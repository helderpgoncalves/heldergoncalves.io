// Gera o ícone do site a partir da própria imagem de hero (fonte/hero.png), cortada à volta da figura
// sentada na colina, com o céu de fim de tarde por cima.
//   npm run icone  →  app/icon.png, app/favicon.ico, app/apple-icon.png, public/icon-192.png, public/icon-512.png
import sharp from 'sharp';
import { writeFile, unlink } from 'node:fs/promises';

// Corte quadrado sobre o original 4096×2731: a figura fica a meio, um pouco abaixo do centro.
const corte = { left: 1260, top: 1200, width: 1000, height: 1000 };

// O original tem um padrão de barras finas: um desfoque leve apaga-o antes de reduzir.
const recorte = await sharp('fonte/hero.png').extract(corte).blur(6.5).png().toBuffer();
const base = (s) => sharp(recorte).resize(s, s, { kernel: 'lanczos3' }).sharpen({ sigma: s < 64 ? 0.8 : 0.5 });
// PNG com paleta: o ícone é uma foto suave, e assim pesa um quinto sem se notar a diferença.
const png = { palette: true, quality: 85, effort: 10, dither: 1 };
const arredondado = async (s, canto = 0.22) => {
  const mascara = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${s}" height="${s}"><rect width="${s}" height="${s}" rx="${s * canto}"/></svg>`);
  return base(s).composite([{ input: mascara, blend: 'dest-in' }]).png(png).toBuffer();
};
const quadrado = (s) => base(s).png(png).toBuffer();

// .ico com PNGs lá dentro (16, 32 e 48 px), aceite por todos os navegadores actuais.
async function ico(tamanhos) {
  const imgs = await Promise.all(tamanhos.map((s) => arredondado(s, 0.18)));
  const cab = Buffer.alloc(6 + 16 * imgs.length);
  cab.writeUInt16LE(1, 2); cab.writeUInt16LE(imgs.length, 4);
  let desloc = cab.length;
  imgs.forEach((b, i) => {
    const o = 6 + i * 16, s = tamanhos[i];
    cab[o] = s; cab[o + 1] = s; cab.writeUInt16LE(1, o + 4); cab.writeUInt16LE(32, o + 6);
    cab.writeUInt32LE(b.length, o + 8); cab.writeUInt32LE(desloc, o + 12);
    desloc += b.length;
  });
  return Buffer.concat([cab, ...imgs]);
}

await unlink('app/icon.svg').catch(() => {});
await writeFile('app/icon.png', await arredondado(192)); // os separadores mostram 32 px: 192 chega e sobra
await writeFile('app/favicon.ico', await ico([16, 32, 48]));
await writeFile('app/apple-icon.png', await quadrado(180)); // o iOS arredonda sozinho
await writeFile('public/icon-192.png', await quadrado(192));
await writeFile('public/icon-512.png', await quadrado(512));
console.log('ícones ok');
