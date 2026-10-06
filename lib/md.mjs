// Lê e converte os .md de content/<lang>/. É JavaScript simples (.mjs) para o
// site e o script de envio da newsletter usarem exactamente o mesmo código.
import fs from 'node:fs';
import path from 'node:path';
import { parse } from 'yaml';
import { Marked } from 'marked';

const raiz = path.join(process.cwd(), 'content');

const slugar = (s) =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

const escapar = (s) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

const marked = new Marked({
  gfm: true,
  renderer: {
    // Títulos com id, para ligações directas e para o índice de leitura.
    heading({ tokens, depth }) {
      const texto = tokens.map((t) => t.raw).join('');
      return `<h${depth} id="${slugar(texto)}">${this.parser.parseInline(tokens)}</h${depth}>\n`;
    },
    // HTML cru nos .md não passa: aparece como texto. Só o markdown manda.
    html({ text }) {
      return escapar(text);
    },
    // Imagens: só do próprio site ou por https.
    image({ href, title, text }) {
      if (!/^(https:\/\/|\/(?!\/))/i.test(href)) return escapar(text);
      return `<img src="${escapar(href)}" alt="${escapar(text)}"${title ? ` title="${escapar(title)}"` : ''} loading="lazy" decoding="async">`;
    },
    // Só http(s), mailto, âncoras e caminhos do próprio site; nada de javascript:.
    // Ligações externas abrem com segurança.
    link({ href, title, tokens }) {
      if (!/^(https?:\/\/|mailto:|#|\/(?!\/))/i.test(href)) return this.parser.parseInline(tokens);
      href = escapar(href);
      title = title ? escapar(title) : title;
      const externo = /^https?:\/\//.test(href);
      const t = title ? ` title="${title}"` : '';
      const extra = externo ? ' rel="noopener noreferrer" target="_blank"' : '';
      return `<a href="${href}"${t}${extra}>${this.parser.parseInline(tokens)}</a>`;
    },
  },
});

export function renderizar(md) {
  return marked.parse(md, { async: false });
}

const obrigatorios = ['titulo', 'resumo', 'data'];

// Cabeçalho YAML entre duas linhas `---`, depois o corpo em Markdown.
function separar(texto, onde) {
  const m = texto.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!m) throw new Error(`${onde}: falta o cabeçalho entre --- e ---`);
  return { data: parse(m[1]) ?? {}, content: m[2] };
}

function ler(lang, ficheiro) {
  const slug = ficheiro.replace(/\.md$/, '');
  const onde = `content/${lang}/${ficheiro}`;
  const { data, content } = separar(fs.readFileSync(path.join(raiz, lang, ficheiro), 'utf8'), onde);
  for (const k of obrigatorios) {
    if (!data[k]) throw new Error(`${onde}: falta "${k}" no cabeçalho`);
  }
  const dia = String(data.data); // o YAML 1.2 mantém as datas como texto
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dia)) throw new Error(`${onde}: "data" tem de ser AAAA-MM-DD`);
  if (data.rascunho === true) return null; // rascunho: não existe para ninguém
  const palavras = content.split(/\s+/).filter(Boolean).length;
  return {
    slug,
    lang,
    titulo: String(data.titulo),
    resumo: String(data.resumo),
    data: dia,
    etiquetas: Array.isArray(data.etiquetas) ? data.etiquetas.map(String) : [],
    fonte: data.fonte ? { nome: String(data.fonte.nome), url: String(data.fonte.url) } : null,
    par: data.par ? String(data.par) : slug, // slug do mesmo texto na outra língua
    notificar: data.notificar !== false, // false = não avisar os subscritores
    minutos: Math.max(1, Math.round(palavras / 220)),
    md: content,
  };
}

/** Os artigos publicados de uma língua, do mais recente para o mais antigo. */
export function artigos(lang) {
  const dir = path.join(raiz, lang);
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith('.md'))
    .map((f) => ler(lang, f))
    .filter(Boolean)
    .sort((a, b) => b.data.localeCompare(a.data));
}

export function artigo(lang, slug) {
  return artigos(lang).find((a) => a.slug === slug) ?? null;
}
