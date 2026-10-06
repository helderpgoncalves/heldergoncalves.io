// Cria uma mini-app nova num subdomínio.
//
//   npm run nova-app -- <nome> ["<descrição>"]   (a descrição vai para os metadados da página)
//
// Gera app/(<nome>)/s/<nome>/ (layout, página, robots) e regista-a em lib/apps.ts como inactiva.
// Depois: escreve a app, põe `ativo: true`, e acrescenta https://<nome>.heldergoncalves.io ao Coolify.
import fs from 'node:fs';
import path from 'node:path';

const [nome, ...resto] = process.argv.slice(2);
const descricao = resto.join(' ').trim() || 'Uma mini-app.';
const sair = (m) => { console.error(`✗ ${m}`); process.exit(1); };

const RESERVADOS = ['www', 'api', 'mail', 'smtp', 'admin', 'static', 'cdn', 'ftp', 'ns1', 'ns2', 'localhost', 's', 'en', 'escritos'];
if (!nome || !/^[a-z][a-z0-9-]{1,30}$/.test(nome)) sair('Nome inválido. Usa minúsculas, números e hífenes (2–31 caracteres), a começar por uma letra.');
if (RESERVADOS.includes(nome)) sair(`"${nome}" é um nome reservado.`);

const pasta = path.join('app', `(${nome})`, 's', nome);
if (fs.existsSync(pasta)) sair(`${pasta} já existe.`);
const titulo = nome.charAt(0).toUpperCase() + nome.slice(1);
const esc = (s) => s.replace(/\\/g, '\\\\').replace(/'/g, "\\'");

fs.mkdirSync(path.join(pasta, 'robots.txt'), { recursive: true });
fs.writeFileSync(path.join(pasta, 'layout.tsx'), `import type { Metadata } from 'next';
import '../../../globals.css';
import { fontes } from '@/lib/fontes';

export const metadata: Metadata = {
  metadataBase: new URL('https://${nome}.heldergoncalves.io'),
  title: { default: '${titulo}', template: '%s — ${titulo}' },
  description: '${esc(descricao)}',
  robots: { index: false, follow: false }, // muda para true quando estiver pronta
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-PT" className={fontes}>
      <body>{children}</body>
    </html>
  );
}
`);
fs.writeFileSync(path.join(pasta, 'page.tsx'), `export default function Pagina() {
  return (
    <main className="papel grid place-items-center px-6">
      <h1 className="font-serif text-[clamp(3rem,9vw,6rem)] leading-[0.95] tracking-[-0.03em]">${titulo}</h1>
    </main>
  );
}
`);
fs.writeFileSync(path.join(pasta, 'robots.txt', 'route.ts'), `export const dynamic = 'force-static';
export const GET = () => new Response('User-agent: *\\nDisallow: /\\n', { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
`);

const reg = 'lib/apps.ts';
const src = fs.readFileSync(reg, 'utf8');
const marca = '  // NOVAS-APPS';
if (!src.includes(marca)) sair('Não encontrei a marca NOVAS-APPS em lib/apps.ts.');
if (src.includes(`sub: '${nome}'`)) sair(`"${nome}" já está registada em lib/apps.ts.`);
fs.writeFileSync(reg, src.replace(marca, `  { sub: '${nome}', ativo: false },\n${marca}`));

console.log(`✓ ${pasta}/ criada e registada (inactiva).
  Ver em desenvolvimento:  http://${nome}.localhost:3100
  Quando estiver pronta:   ativo: true em lib/apps.ts, robots.index: true, e https://${nome}.heldergoncalves.io no Coolify.`);
