// Gera o ícone do site a partir de um desenho SVG: o fim de tarde da imagem de hero, em miniatura
// (céu azul a arder no horizonte, o sol a pôr-se atrás da colina e a figura sentada a ver).
//   npm run icone  →  app/icon.svg, app/favicon.ico, app/apple-icon.png, public/icon-192.png, public/icon-512.png
import sharp from 'sharp';
import { writeFile } from 'node:fs/promises';

// `canto`: 14 para o ícone do separador; 0 para os que o sistema arredonda (iOS, Android).
const desenho = (canto) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
<defs>
<linearGradient id="c" x1="0" y1="0" x2="0" y2="1">
<stop offset="0" stop-color="#25457a"/><stop offset=".38" stop-color="#5f79a6"/><stop offset=".62" stop-color="#d79a86"/><stop offset=".8" stop-color="#f4b36a"/><stop offset="1" stop-color="#ffd9a0"/>
</linearGradient>
<radialGradient id="s" cx="46" cy="42" r="22" gradientUnits="userSpaceOnUse">
<stop offset="0" stop-color="#fff2cf" stop-opacity=".95"/><stop offset=".35" stop-color="#ffc77d" stop-opacity=".55"/><stop offset="1" stop-color="#f4b36a" stop-opacity="0"/>
</radialGradient>
<linearGradient id="h" x1="0" y1="36" x2="0" y2="64" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#16231f"/><stop offset="1" stop-color="#070d12"/></linearGradient>
<clipPath id="r"><rect width="64" height="64" rx="${canto}"/></clipPath>
</defs>
<g clip-path="url(#r)">
<rect width="64" height="64" fill="url(#c)"/>
<ellipse cx="17" cy="22" rx="14" ry="5" fill="#ffc2a0" opacity=".6"/>
<ellipse cx="25" cy="27" rx="12" ry="4" fill="#ffb48f" opacity=".55"/>
<ellipse cx="50" cy="14" rx="9" ry="3" fill="#ffcfae" opacity=".5"/>
<circle cx="46" cy="42" r="22" fill="url(#s)"/>
<circle cx="46" cy="42" r="5.2" fill="#fff4d6"/>
<path d="M0 45C10 40 20 39 30 43C40 47 52 46 64 43V64H0Z" fill="url(#h)"/>
<g fill="url(#h)"><circle cx="21.6" cy="36.4" r="1.7"/><path d="M18.4 45C18.2 40.6 19.4 38.6 21.6 38.4C23.8 38.6 25 40.6 24.9 45Z"/></g>
</g>
</svg>`;

const png = (canto, s) => sharp(Buffer.from(desenho(canto)), { density: (72 * s) / 64 }).resize(s, s).png({ compressionLevel: 9 }).toBuffer();

// .ico com PNGs lá dentro (16, 32 e 48 px), aceite por todos os navegadores actuais.
async function ico(tamanhos) {
  const imgs = await Promise.all(tamanhos.map((s) => png(14, s)));
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

await writeFile('app/icon.svg', desenho(14).replace(/\n(?=[<])/g, '\n') + '\n');
await writeFile('app/favicon.ico', await ico([16, 32, 48]));
await writeFile('app/apple-icon.png', await png(0, 180));
await writeFile('public/icon-192.png', await png(0, 192));
await writeFile('public/icon-512.png', await png(0, 512));
console.log('ícones ok');
