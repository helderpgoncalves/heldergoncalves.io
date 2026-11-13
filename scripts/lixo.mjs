// Procura lixo no repositório: ficheiros que ninguém importa, exports sem uso, imagens e dependências órfãs.
// Só lê; não apaga nada. Uso: npm run lixo   (sai com código 1 se encontrar alguma coisa)
import fs from 'node:fs';
import path from 'node:path';

const raiz = process.cwd();
const IGNORAR = new Set(['node_modules', '.git', '.next', '.claude']);
const ficheiros = [];
(function percorrer(d) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    if (IGNORAR.has(e.name) || e.name === '.DS_Store') continue;
    const p = path.join(d, e.name);
    e.isDirectory() ? percorrer(p) : ficheiros.push(p);
  }
})(raiz);

const rel = (f) => path.relative(raiz, f);
const codigo = ficheiros.filter((f) => /\.(tsx?|mjs|css)$/.test(f));
const texto = Object.fromEntries(codigo.map((f) => [f, fs.readFileSync(f, 'utf8')]));
const tudo = [...Object.values(texto), ...ficheiros.filter((f) => /\.(md|json)$/.test(f) && !f.endsWith('package-lock.json')).map((f) => fs.readFileSync(f, 'utf8'))].join('\n');

// Pontos de entrada: o Next carrega-os sozinho (app/, proxy, config) ou correm-se à mão (scripts/).
const entrada = (f) => /^(app|scripts)\//.test(rel(f)) || /^(proxy|next\.config)\.ts$|^postcss\.config\.mjs$|^next-env\.d\.ts$/.test(rel(f));

const resolver = (de, spec) => {
  const base = spec.startsWith('@/') ? path.join(raiz, spec.slice(2)) : path.resolve(path.dirname(de), spec);
  for (const c of [base, ...['.ts', '.tsx', '.mjs', '.css', '.json'].map((x) => base + x), path.join(base, 'index.ts'), path.join(base, 'index.tsx')]) {
    if (fs.existsSync(c) && fs.statSync(c).isFile()) return c;
  }
  return null;
};
const importados = new Set();
for (const f of codigo) {
  for (const m of texto[f].matchAll(/(?:from\s+|import\s*\(?\s*)['"]([^'"]+)['"]/g)) {
    if (m[1].startsWith('.') || m[1].startsWith('@/')) {
      const r = resolver(f, m[1]);
      if (r) importados.add(r);
    }
  }
}

const achados = [];
for (const f of codigo) if (!entrada(f) && !importados.has(f)) achados.push(`ficheiro sem importações: ${rel(f)}`);

for (const f of codigo.filter((f) => /\.(tsx?|mjs)$/.test(f) && !entrada(f))) {
  for (const m of texto[f].matchAll(/export\s+(?:async\s+)?(?:const|function|class|type|interface|let)\s+(\w+)/g)) {
    const usado = codigo.some((g) => g !== f && new RegExp(`\\b${m[1]}\\b`).test(texto[g]));
    if (!usado) achados.push(`export sem uso: ${rel(f)} → ${m[1]}`);
  }
}

// Imagens: o nome pode estar montado por template (hero-${w}), por isso procura-se o prefixo antes do primeiro número.
for (const f of ficheiros.filter((f) => /^(public|fonte)\//.test(rel(f)) || /^app\/[^/]+\.(png|ico)$/.test(rel(f)))) {
  const nome = path.basename(f);
  const prefixo = nome.replace(/-?\d+\.\w+$/, '');
  if (!tudo.includes(nome) && !(prefixo !== nome && tudo.includes(prefixo))) achados.push(`ficheiro estático sem referência: ${rel(f)}`);
}

// Dependências que nada importa (as de tipos, o TypeScript e o react-dom são exigidos pelo Next e pelo tsc).
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const EXIGIDAS = new Set(['react-dom', 'typescript', 'postcss']);
for (const d of Object.keys({ ...pkg.dependencies, ...pkg.devDependencies })) {
  if (d.startsWith('@types/') || EXIGIDAS.has(d)) continue;
  if (!tudo.includes(`'${d}`) && !tudo.includes(`"${d}`) && !tudo.includes(`${d}/`)) achados.push(`dependência sem uso: ${d}`);
}

// Scripts do package.json que apontam para ficheiros que não existem, e scripts/ que ninguém chama.
for (const [k, v] of Object.entries(pkg.scripts)) {
  const m = v.match(/scripts\/(\S+\.mjs)/);
  if (m && !fs.existsSync(`scripts/${m[1]}`)) achados.push(`script do package.json partido: ${k}`);
}
for (const f of ficheiros.filter((f) => rel(f).startsWith('scripts/'))) {
  if (!JSON.stringify(pkg.scripts).includes(path.basename(f)) && !tudo.includes(`scripts/${path.basename(f)}`)) achados.push(`script nunca chamado: ${rel(f)}`);
}

if (achados.length) {
  console.log(achados.join('\n'));
  console.log(`\n${achados.length} achado(s). Confirma cada um antes de apagar (nomes montados por template enganam a procura).`);
  process.exit(1);
}
console.log('✓ sem lixo.');
