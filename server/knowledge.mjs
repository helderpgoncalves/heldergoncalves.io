// ─────────────────────────────────────────────────────────────────────
// O que o agente sabe.
//
// São os ficheiros .md da pasta knowledge/ e os escritos publicados.
// Editar um ficheiro e fazer deploy é tudo o que é preciso para o
// ensinar: não há código a mexer, nem prompt escondido no meio do
// JavaScript. Ensinar-lhe um assunto novo é criar um .md.
// ─────────────────────────────────────────────────────────────────────
import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { KNOWLEDGE_DIR, ROOT } from './config.mjs';

const KB_LIMIT = 48 * 1024;

async function loadKnowledge() {
  const out = [];
  let total = 0;
  try {
    const files = (await readdir(KNOWLEDGE_DIR))
      .filter((f) => f.endsWith('.md') && f.toLowerCase() !== 'readme.md')
      .sort();
    for (const file of files) {
      const body = (await readFile(join(KNOWLEDGE_DIR, file), 'utf8')).trim();
      if (!body || total + body.length > KB_LIMIT) continue;
      total += body.length;
      const heading = body.match(/^#\s+(.+)$/m);
      out.push({ file, title: heading ? heading[1].trim() : file.replace(/\.md$/, ''), text: body });
    }
  } catch (_) {
    /* sem pasta, o agente fica só com o essencial */
  }
  return out;
}

async function loadPosts() {
  try {
    const data = JSON.parse(await readFile(join(ROOT, 'posts.json'), 'utf8'));
    return Array.isArray(data.posts) ? data.posts : [];
  } catch (_) {
    return [];
  }
}

export const KNOWLEDGE = await loadKnowledge();
export const POSTS = await loadPosts();

/** Palavras com significado, sem acentos, para comparar à vontade. */
const words = (s) =>
  String(s)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length > 2);

const fold = (s) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

/** Procura nas secções e nos escritos. Devolve texto, não HTML. */
export function search(query) {
  const terms = words(query).slice(0, 12);
  if (!terms.length) return 'Sem termos de pesquisa.';

  const score = (hay) => {
    const h = fold(hay);
    return terms.reduce((n, t) => n + (h.includes(t) ? 1 : 0), 0);
  };
  const best = (list, text, take) =>
    list
      .map((item) => ({ item, n: score(text(item)) }))
      .filter((x) => x.n > 0)
      .sort((a, b) => b.n - a.n)
      .slice(0, take)
      .map((x) => x.item);

  const sections = best(KNOWLEDGE, (k) => k.title + ' ' + k.text, 2);
  const posts = best(POSTS, (p) => p.title + ' ' + p.description + ' ' + (p.tags || []).join(' '), 4);

  const parts = sections.map((k) => '## ' + k.title + '\n' + k.text.slice(0, 3000));
  if (posts.length) parts.push('## Escritos relacionados\n' + posts.map(postLine).join('\n'));
  return parts.length ? parts.join('\n\n') : 'Nada encontrado sobre isso na base de conhecimento.';
}

export const postLine = (p) =>
  '- ' + p.title + ' (' + p.date + ', ' + p.lang + '): ' + p.description + ' — ' + p.url;

/** O índice das secções, para o agente saber o que pode pedir. */
export const knowledgeIndex = () => KNOWLEDGE.map((k) => '- ' + k.title + ' (' + k.file + ')').join('\n');
