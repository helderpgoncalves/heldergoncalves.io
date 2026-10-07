// Lê e converte os .md de content/<lang>/. É JavaScript simples (.mjs) para o
// site e o script de envio da newsletter usarem exactamente o mesmo código.
import fs from 'node:fs';
import path from 'node:path';
import { parse } from 'yaml';
import { Marked } from 'marked';
import hljs from 'highlight.js/lib/core';
import javascript from 'highlight.js/lib/languages/javascript';
import typescript from 'highlight.js/lib/languages/typescript';
import python from 'highlight.js/lib/languages/python';
import bash from 'highlight.js/lib/languages/bash';
import json from 'highlight.js/lib/languages/json';
import css from 'highlight.js/lib/languages/css';
import xml from 'highlight.js/lib/languages/xml';
import yaml from 'highlight.js/lib/languages/yaml';
import sql from 'highlight.js/lib/languages/sql';
import diff from 'highlight.js/lib/languages/diff';
import markdown from 'highlight.js/lib/languages/markdown';
import go from 'highlight.js/lib/languages/go';
import rust from 'highlight.js/lib/languages/rust';
import dockerfile from 'highlight.js/lib/languages/dockerfile';
import plaintext from 'highlight.js/lib/languages/plaintext';

Object.entries({ javascript, typescript, python, bash, json, css, xml, yaml, sql, diff, markdown, go, rust, dockerfile, plaintext }).forEach(([nome, l]) => hljs.registerLanguage(nome, l));

const raiz = path.join(process.cwd(), 'content');

// Imagens preparadas por `npm run imagens-blog` (dimensões, tamanhos e marcador desfocado).
const imagens = (() => {
  try { return JSON.parse(fs.readFileSync(path.join(raiz, 'imagens.json'), 'utf8')); } catch { return {}; }
})();
const prefixo = '/img/blog/';

export const slugar = (s) =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

const escapar = (s) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

/** Chave da imagem a partir do que se escreve nos textos: `pasta/nome`, com ou sem extensão ou prefixo. */
export const chaveImagem = (href) => {
  const m = String(href).match(/^(?:\/img\/blog\/)?([a-z0-9][a-z0-9-]*\/[a-z0-9][a-z0-9._-]*?)(?:\.(?:jpe?g|png|webp|avif|svg))?$/i);
  return m ? m[1] : null;
};
export const infoImagem = (chave) => imagens[chave] ?? null;
const ficheiro = (chave, w, fmt) => `${prefixo}${chave}-${w}.${fmt}`;

/** Cartão de partilha 1200×630 da imagem (ou null se não existir). */
export const imagemOg = (chave) => (imagens[chave] && imagens[chave].ext !== 'svg' ? `${prefixo}${chave}-og.jpg` : null);

/** A versão grande da imagem, para o JSON-LD e para quem quer a imagem inteira. */
export const imagemGrande = (chave) => {
  const i = imagens[chave];
  if (!i) return null;
  return i.ext === 'svg' ? `${prefixo}${chave}.svg` : ficheiro(chave, i.larguras.includes(1600) ? 1600 : i.larguras.at(-1), i.ext);
};

/**
 * <picture> com AVIF, WebP e JPEG/PNG, largura e altura reais (sem saltos de layout) e marcador
 * desfocado enquanto carrega. `sizes` diz ao navegador quanto espaço a imagem ocupa.
 */
export function figura(chave, { alt, legenda, credito, larga = false, ansiosa = false, sizes, classe = '' } = {}) {
  const i = imagens[chave];
  if (!i) throw new Error(`imagem "${chave}" não existe: põe-na em fonte/blog/ e corre "npm run imagens-blog".`);
  const tam = sizes ?? (larga ? '(min-width: 928px) 832px, calc(100vw - 48px)' : '(min-width: 800px) 704px, calc(100vw - 48px)');
  const legendaHtml = legenda || credito
    ? `<figcaption>${legenda ? escapar(legenda) : ''}${credito ? `<span class="credito">${escapar(credito)}</span>` : ''}</figcaption>`
    : '';
  const cls = `fig${larga ? ' larga' : ''}${classe ? ' ' + classe : ''}`;
  const fundo = i.lqip ? ` style="background-image:url(${i.lqip})"` : '';
  const atrs = `alt="${escapar(alt ?? '')}" width="${i.w}" height="${i.h}" decoding="async"${ansiosa ? ' fetchpriority="high"' : ' loading="lazy"'}`;
  if (i.ext === 'svg') return `<figure class="${cls}"><img src="${prefixo}${chave}.svg" ${atrs}${fundo}>${legendaHtml}</figure>`;
  const srcset = (fmt) => i.larguras.map((w) => `${ficheiro(chave, w, fmt)} ${w}w`).join(', ');
  const maior = i.larguras.includes(1200) ? 1200 : i.larguras.at(-1);
  return `<figure class="${cls}"><picture>`
    + `<source type="image/avif" srcset="${srcset('avif')}" sizes="${tam}">`
    + `<source type="image/webp" srcset="${srcset('webp')}" sizes="${tam}">`
    + `<img src="${ficheiro(chave, maior, i.ext)}" srcset="${srcset(i.ext)}" sizes="${tam}" ${atrs}${fundo}>`
    + `</picture>${legendaHtml}</figure>`;
}

// Texto simples de uns tokens (para os ids dos títulos e para o índice).
const desescapar = (s) => s.replace(/&(amp|lt|gt|quot|#39);/g, (_, c) => ({ amp: '&', lt: '<', gt: '>', quot: '"', '#39': "'" })[c]);
const simples = (tokens) => desescapar(tokens.map((t) => (t.tokens ? simples(t.tokens) : t.text ?? t.raw ?? '')).join(''));

let usados = new Set(); // ids de títulos já usados neste texto
const idUnico = (texto) => {
  const base = slugar(texto) || 'seccao';
  let id = base;
  for (let n = 2; usados.has(id); n++) id = `${base}-${n}`;
  usados.add(id);
  return id;
};

let modoSimples = false; // feed e e-mail: <img> simples, sem <picture> nem âncoras

const marked = new Marked({
  gfm: true,
  renderer: {
    // Títulos com id e uma âncora ("#") para partilhar uma secção.
    heading({ tokens, depth }) {
      const id = idUnico(simples(tokens));
      const ancora = modoSimples ? '' : `<a class="ancora" href="#${id}" aria-label="Ligação para esta secção">#</a>`;
      return `<h${depth} id="${id}">${this.parser.parseInline(tokens)}${ancora}</h${depth}>\n`;
    },
    // Uma imagem sozinha num parágrafo é uma figura: nada de <figure> dentro de <p>.
    paragraph({ tokens }) {
      const corpo = this.parser.parseInline(tokens);
      return tokens.length === 1 && tokens[0].type === 'image' ? `${corpo}\n` : `<p>${corpo}</p>\n`;
    },
    // HTML cru nos .md não passa: aparece como texto. Só o markdown manda.
    html({ text }) {
      return escapar(text);
    },
    // ![descrição](pasta/nome.jpg "legenda"). Com "|larga" no fim da descrição, sai mais larga que o texto.
    image({ href, title, text }) {
      const larga = /\|\s*larga\s*$/i.test(text);
      const alt = text.replace(/\s*\|\s*larga\s*$/i, '');
      const chave = chaveImagem(href);
      if (chave && imagens[chave]) {
        if (!modoSimples) return figura(chave, { alt, legenda: title ?? undefined, larga });
        const i = imagens[chave];
        const src = i.ext === 'svg' ? `${prefixo}${chave}.svg` : ficheiro(chave, i.larguras.includes(1200) ? 1200 : i.larguras.at(-1), i.ext);
        const img = `<img src="${src}" alt="${escapar(alt)}" width="${i.w}" height="${i.h}">`;
        return title ? `<figure>${img}<figcaption>${escapar(title)}</figcaption></figure>` : img;
      }
      // `pasta/nome` sem imagem preparada: falha o build em vez de publicar uma imagem partida.
      if (chave && !/^(https?:)?\/\//i.test(href)) {
        throw new Error(`imagem "${href}" não encontrada: põe-na em fonte/blog/ e corre "npm run imagens-blog".`);
      }
      // Imagens de fora só por https (a política de segurança do site só deixa passar as do próprio).
      if (!/^(https:\/\/|\/(?!\/))/i.test(href)) return escapar(alt);
      return `<img src="${escapar(href)}" alt="${escapar(alt)}"${title ? ` title="${escapar(title)}"` : ''} loading="lazy" decoding="async">`;
    },
    // Código com realce de sintaxe feito aqui, no build: zero JavaScript no navegador.
    code({ text, lang }) {
      const l = (lang ?? '').trim().split(/\s+/)[0].toLowerCase();
      if (modoSimples || !l || !hljs.getLanguage(l)) return `<pre${l ? ` data-lang="${escapar(l)}"` : ''}><code>${escapar(text)}</code></pre>\n`;
      const corpo = hljs.highlight(text, { language: l, ignoreIllegals: true }).value;
      return `<div class="codigo" data-lang="${escapar(l)}"><pre tabindex="0"><code class="hljs">${corpo}</code></pre></div>\n`;
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

/** @param {{ simples?: boolean }} [opcoes] `simples`: para feed e e-mail (sem <picture> nem âncoras). */
export function renderizar(md, opcoes = {}) {
  usados = new Set();
  modoSimples = Boolean(opcoes.simples);
  try {
    return marked.parse(md, { async: false });
  } finally {
    modoSimples = false;
  }
}

/** Os títulos (## e ###) do texto, com os mesmos ids que `renderizar` lhes dá. */
export function indice(md) {
  usados = new Set();
  return marked
    .lexer(md)
    .filter((t) => t.type === 'heading')
    .map((t) => ({ id: idUnico(simples(t.tokens)), texto: simples(t.tokens), nivel: t.depth }))
    .filter((t) => t.nivel === 2 || t.nivel === 3);
}

const obrigatorios = ['titulo', 'resumo', 'data'];
const dataValida = (d) => /^\d{4}-\d{2}-\d{2}$/.test(d);

// Cabeçalho YAML entre duas linhas `---`, depois o corpo em Markdown.
function separar(texto, onde) {
  const m = texto.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!m) throw new Error(`${onde}: falta o cabeçalho entre --- e ---`);
  return { data: parse(m[1]) ?? {}, content: m[2] };
}

function ler(lang, nomeFicheiro) {
  const slug = nomeFicheiro.replace(/\.md$/, '');
  const onde = `content/${lang}/${nomeFicheiro}`;
  const { data, content } = separar(fs.readFileSync(path.join(raiz, lang, nomeFicheiro), 'utf8'), onde);
  for (const k of obrigatorios) {
    if (!data[k]) throw new Error(`${onde}: falta "${k}" no cabeçalho`);
  }
  const dia = String(data.data); // o YAML 1.2 mantém as datas como texto
  if (!dataValida(dia)) throw new Error(`${onde}: "data" tem de ser AAAA-MM-DD`);
  if (data.rascunho === true) return null; // rascunho: não existe para ninguém
  const atualizado = data.atualizado ? String(data.atualizado) : null;
  if (atualizado && (!dataValida(atualizado) || atualizado < dia)) throw new Error(`${onde}: "atualizado" tem de ser AAAA-MM-DD e não anterior a "data"`);
  let capa = null;
  if (data.capa) {
    const chave = chaveImagem(data.capa.imagem ?? '');
    if (!chave || !imagens[chave]) throw new Error(`${onde}: capa.imagem "${data.capa.imagem}" não existe (põe-na em fonte/blog/ e corre "npm run imagens-blog")`);
    if (!data.capa.alt) throw new Error(`${onde}: a capa precisa de "alt" (a descrição para quem não vê a imagem)`);
    capa = { imagem: chave, alt: String(data.capa.alt), legenda: data.capa.legenda ? String(data.capa.legenda) : null, credito: data.capa.credito ? String(data.capa.credito) : null };
  }
  const palavras = content.split(/\s+/).filter(Boolean).length;
  return {
    slug,
    lang,
    titulo: String(data.titulo),
    resumo: String(data.resumo),
    data: dia,
    atualizado,
    capa,
    etiquetas: Array.isArray(data.etiquetas) ? data.etiquetas.map(String) : [],
    fonte: data.fonte ? { nome: String(data.fonte.nome), url: String(data.fonte.url) } : null,
    par: data.par ? String(data.par) : slug, // slug do mesmo texto na outra língua
    notificar: data.notificar !== false, // false = não avisar os subscritores
    minutos: Math.max(1, Math.round(palavras / 220)),
    palavras,
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
    .sort((a, b) => b.data.localeCompare(a.data) || a.slug.localeCompare(b.slug));
}

export function artigo(lang, slug) {
  return artigos(lang).find((a) => a.slug === slug) ?? null;
}
