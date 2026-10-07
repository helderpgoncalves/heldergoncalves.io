// Prepara as imagens do blog: AVIF, WebP e JPEG/PNG em vários tamanhos, mais um cartão
// de partilha 1200×630 e um marcador desfocado (para a página não "saltar" a carregar).
//
//   fonte/blog/<pasta>/<nome>.(jpg|png|webp|avif|svg)   ← põe aqui os originais
//   npm run imagens-blog                              ← gera public/img/blog/ e content/imagens.json
//
// Nos textos usa-se `![descrição](pasta/nome.jpg "legenda")`. Só refaz o que mudou.
import sharp from 'sharp';
import { mkdir, readdir, readFile, writeFile, copyFile, stat } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';

const fonte = 'fonte/blog';
const saida = 'public/img/blog';
const manifesto = 'content/imagens.json';
const tamanhos = [480, 800, 1200, 1600, 2400];
const extensoes = new Set(['.jpg', '.jpeg', '.png', '.webp', '.avif', '.svg']);

const antes = await readFile(manifesto, 'utf8').then(JSON.parse, () => ({}));
const novo = {};
let feitas = 0;

const ficheiros = async (dir) => {
  const itens = await readdir(dir, { withFileTypes: true }).catch(() => []);
  return (await Promise.all(itens.map((i) => (i.isDirectory() ? ficheiros(path.join(dir, i.name)) : [path.join(dir, i.name)])))).flat();
};

for (const ficheiro of (await ficheiros(fonte)).sort()) {
  const ext = path.extname(ficheiro).toLowerCase();
  if (!extensoes.has(ext)) continue;
  const rel = path.relative(fonte, ficheiro).split(path.sep).join('/');
  const chave = rel.slice(0, -ext.length);
  if (!/^[a-z0-9][a-z0-9-]*\/[a-z0-9][a-z0-9._-]*$/.test(chave)) {
    console.error(`✗ ${rel}: usa fonte/blog/<pasta>/<nome>, em minúsculas, números e hífens (sem espaços nem acentos).`);
    process.exit(1);
  }
  const buf = await readFile(ficheiro);
  const hash = createHash('sha1').update(buf).digest('hex').slice(0, 12);
  const dir = path.join(saida, path.dirname(chave));
  await mkdir(dir, { recursive: true });

  if (antes[chave]?.hash === hash) { novo[chave] = antes[chave]; continue; }

  if (ext === '.svg') {
    const { width, height } = await sharp(buf).metadata();
    await copyFile(ficheiro, path.join(saida, `${chave}.svg`));
    novo[chave] = { hash, w: Math.round(width), h: Math.round(height), ext: 'svg', larguras: [], lqip: '' };
    console.log('ok', rel, '(svg)');
    feitas++;
    continue;
  }

  const base = sharp(buf, { failOn: 'none' }).rotate(); // respeita a orientação da câmara
  const { width: W, height: H, hasAlpha } = await sharp(await base.clone().toBuffer()).metadata();
  const fallback = hasAlpha ? 'png' : 'jpg';
  const larguras = [...new Set([...tamanhos.filter((t) => t < W), Math.min(W, tamanhos.at(-1))])].sort((a, b) => a - b);

  for (const w of larguras) {
    const redim = () => base.clone().resize({ width: w, withoutEnlargement: true, kernel: 'lanczos3' });
    const alvo = path.join(saida, `${chave}-${w}`);
    await redim().avif({ quality: 62, effort: 6 }).toFile(`${alvo}.avif`);
    await redim().webp({ quality: 82, effort: 5 }).toFile(`${alvo}.webp`);
    if (fallback === 'png') await redim().png({ compressionLevel: 9 }).toFile(`${alvo}.png`);
    else await redim().jpeg({ quality: 82, mozjpeg: true }).toFile(`${alvo}.jpg`);
  }

  // Cartão de partilha (Open Graph / X): recorte 1200×630 onde há mais "acção".
  await base.clone().resize(1200, 630, { fit: 'cover', position: sharp.strategy.attention }).flatten({ background: '#0a1020' }).jpeg({ quality: 86, mozjpeg: true }).toFile(path.join(saida, `${chave}-og.jpg`));

  // Marcador: 24 px de largura, desfocado, em WebP (cerca de 300 bytes).
  const mini = await base.clone().resize(24).flatten({ background: '#0a1020' }).webp({ quality: 40 }).toBuffer();
  novo[chave] = { hash, w: W, h: H, ext: fallback, larguras, lqip: `data:image/webp;base64,${mini.toString('base64')}` };
  console.log('ok', rel, `${W}×${H}`, larguras.join(' '));
  feitas++;
}

const ordenado = Object.fromEntries(Object.entries(novo).sort(([a], [b]) => a.localeCompare(b)));
// Uma imagem por linha: o ficheiro lê-se e as diferenças no git ficam curtas.
await writeFile(manifesto, `{\n${Object.entries(ordenado).map(([k, v]) => `${JSON.stringify(k)}: ${JSON.stringify(v)}`).join(',\n')}\n}\n`);
console.log(`${Object.keys(ordenado).length} imagens no manifesto, ${feitas} novas ou alteradas.`);
