import { randomUUID } from 'node:crypto';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import type { Lang } from './copy';

// Os comentários do blog. Sem base de dados: um ficheiro JSON por linha, só de acrescentar, no volume
// do servidor (DATA_DIR), tal como o chat da mini-app. Cada linha é um comentário ou um «remover».
// Só guardamos um identificador anónimo de quem escreveu (HMAC do e-mail), nunca o endereço.

const DIR = process.env.DATA_DIR ?? path.join(process.cwd(), 'data');
const FICHEIRO = path.join(DIR, 'comentarios-blog.jsonl');

export type ComentarioBlog = { id: string; slug: string; lang: Lang; nome: string; texto: string; criado: string; pai: string | null };
type Linha = (ComentarioBlog & { h: string }) | { remover: string };

const g = globalThis as { __comBlog?: { todos?: Promise<Map<string, ComentarioBlog & { h: string }>>; escritas: Promise<unknown> } };
const estado = (g.__comBlog ??= { escritas: Promise.resolve() });

async function ler() {
  const todos = new Map<string, ComentarioBlog & { h: string }>();
  let conteudo = '';
  try { conteudo = await fs.readFile(FICHEIRO, 'utf8'); } catch (e) {
    if ((e as NodeJS.ErrnoException).code === 'ENOENT') return todos;
    throw e;
  }
  for (const linha of conteudo.split('\n')) {
    if (!linha) continue;
    try {
      const o = JSON.parse(linha) as Record<string, unknown>;
      if (typeof o.remover === 'string') { for (const x of [...todos.values()]) if (x.id === o.remover || x.pai === o.remover) todos.delete(x.id); }
      else if (typeof o.id === 'string' && typeof o.slug === 'string' && typeof o.texto === 'string') todos.set(o.id, o as never);
    } catch { /* uma linha estragada não deita abaixo as outras */ }
  }
  return todos;
}
const todos = () => (estado.todos ??= ler().catch((e) => { estado.todos = undefined; throw e; }));

function acrescentar(linha: Linha) {
  estado.escritas = estado.escritas.catch(() => {}).then(async () => {
    await fs.mkdir(DIR, { recursive: true });
    await fs.appendFile(FICHEIRO, JSON.stringify(linha) + '\n');
  });
  return estado.escritas;
}

const publico = ({ h: _h, ...c }: ComentarioBlog & { h: string }, meu: string | null): ComentarioBlog & { meu: boolean } => ({ ...c, meu: meu !== null && _h === meu });

/** Os comentários de um texto, do mais antigo para o mais recente. `meu` marca os do próprio leitor. */
export async function doTexto(lang: Lang, slug: string, eu: string | null) {
  return [...(await todos()).values()].filter((c) => c.slug === slug && c.lang === lang).sort((a, b) => a.criado.localeCompare(b.criado)).map((c) => publico(c, eu));
}

export const MAX_TEXTO = 2000;
export const MAX_NOME = 40;

export async function criar(d: { lang: Lang; slug: string; nome: string; texto: string; pai: string | null; h: string }) {
  const mapa = await todos();
  if (d.pai && mapa.get(d.pai)?.slug !== d.slug) d.pai = null; // só se responde a comentários do mesmo texto
  if (d.pai && mapa.get(d.pai)?.pai) d.pai = mapa.get(d.pai)!.pai; // um só nível de respostas
  const c = { id: randomUUID(), slug: d.slug, lang: d.lang, nome: d.nome, texto: d.texto, criado: new Date().toISOString(), pai: d.pai, h: d.h };
  mapa.set(c.id, c);
  await acrescentar(c);
  return publico(c, d.h);
}

/** Apaga se for do próprio, ou se `admin`. Devolve se apagou. */
export async function remover(id: string, h: string | null, admin = false) {
  const mapa = await todos();
  const c = mapa.get(id);
  if (!c || (!admin && c.h !== h)) return false;
  for (const x of [...mapa.values()]) if (x.id === id || x.pai === id) mapa.delete(x.id); // as respostas vão com o comentário
  await acrescentar({ remover: id });
  return true;
}

export async function contar(lang: Lang, slug: string) {
  return [...(await todos()).values()].filter((c) => c.slug === slug && c.lang === lang).length;
}
