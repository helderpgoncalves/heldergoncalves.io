import { artigo, artigos, dataLonga } from '@/lib/blog';
import { copy, htmlLang, rotas, type Lang } from '@/lib/copy';
import { abs } from '@/lib/seo';
import { PROJETOS, SITE } from '@/lib/site';

// As mesmas páginas em Markdown, para quem pede `Accept: text/markdown` (o proxy reescreve para aqui).
// Só leitura, sem estado: um agente gasta uma fracção dos tokens que gastaria com o HTML.
export const dynamic = 'force-dynamic';

const cabecalhos = (n: number) => ({
  'Content-Type': 'text/markdown; charset=utf-8',
  'Cache-Control': 'public, max-age=300',
  Vary: 'Accept',
  'X-Markdown-Tokens': String(Math.ceil(n / 4)),
  'X-Robots-Tag': 'noindex', // o endereço canónico é o HTML
});
const md = (corpo: string, estado = 200) => new Response(corpo, { status: estado, headers: cabecalhos(corpo.length) });

function inicio(lang: Lang) {
  const c = copy[lang];
  return `# ${c.nome}\n\n${c.descricao}\n\n- [Blog](${abs(rotas[lang].blog)})\n- [${lang === 'pt' ? 'Bio e ligações' : 'Bio and links'}](${SITE.bio})\n- [GitHub](${SITE.github})\n- [Instagram](${SITE.instagram})\n- ${lang === 'pt' ? 'Contacto' : 'Contact'}: ${SITE.email}\n${PROJETOS.length ? `\n## ${lang === 'pt' ? 'Projetos' : 'Projects'}\n\n${PROJETOS.map((p) => `- [${p.nome}](${p.url}): ${p.descricao[lang]}`).join('\n')}\n` : ''}`;
}

function lista(lang: Lang) {
  const c = copy[lang];
  const itens = artigos(lang);
  return `# ${c.blog.titulo} · ${SITE.nome}\n\n${c.blog.descricao}\n\n${itens.length ? itens.map((a) => `- [${a.titulo}](${abs(rotas[lang].artigo(a.slug))}) (${dataLonga(a.data, lang)}): ${a.resumo}`).join('\n') : c.blog.vazio}\n`;
}

export async function GET(_: Request, { params }: { params: Promise<{ caminho?: string[] }> }) {
  const partes = (await params).caminho ?? [];
  const lang: Lang = partes[0] === 'en' ? 'en' : 'pt';
  const resto = partes[0] === 'en' ? partes.slice(1) : partes;

  if (resto.length === 0) return md(inicio(lang));
  if (resto.length === 1 && resto[0] === 'blog') return md(lista(lang));
  if (resto.length === 2 && resto[0] === 'blog') {
    const a = artigo(lang, resto[1]);
    if (a) {
      const cab = [`# ${a.titulo}`, '', `${SITE.nome} · ${dataLonga(a.data, lang)}${a.atualizado ? ` · ${copy[lang].blog.atualizado} ${dataLonga(a.atualizado, lang)}` : ''} · ${a.minutos} ${copy[lang].blog.min}`, a.serie ? `${copy[lang].blog.serie}: ${a.serie}, ${copy[lang].blog.parte} ${a.parte}` : '', `${abs(rotas[lang].artigo(a.slug))} (${htmlLang[lang]})`, '', `> ${a.resumo}`, ''].filter((l, i, t) => l !== '' || t[i - 1] !== '');
      return md(`${cab.join('\n')}\n\n${a.md.trim()}\n`);
    }
  }
  return md(`# 404\n\nNot found.\n`, 404);
}
