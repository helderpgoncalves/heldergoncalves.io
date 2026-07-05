// ─────────────────────────────────────────────────────────────
// substack.ts — busca o feed RSS do Substack no BUILD e devolve
// os posts já parseados. Escreves no Substack, corre o rebuild e
// os posts aparecem no teu domínio como páginas reais (canonical
// para cá, para o SEO acumular em heldergoncalves.io).
//
// Sem dependências externas: parsing por regex, resiliente a feed
// vazio e a posts sem corpo completo (content:encoded).
// ─────────────────────────────────────────────────────────────
import { SITE } from '../siteConfig';

export interface SubstackPost {
  slug: string;
  title: string;
  description: string; // resumo em texto simples
  pubDate: Date;
  html: string; // corpo completo (content:encoded), '' se ausente
  substackUrl: string;
  hasBody: boolean;
  cover: string | null; // imagem de capa (primeira <img> ou <enclosure>)
  readingMinutes: number; // estimativa de tempo de leitura
}

function feedUrl(): string {
  // Deriva o /feed a partir do URL do Substack em siteConfig.
  const base = SITE.social.substack.replace(/\/+$/, '');
  return `${base}/feed`;
}

// Extrai o conteúdo de <tag>...</tag>, lidando com CDATA.
function tag(xml: string, name: string): string {
  const re = new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)</${name}>`, 'i');
  const m = xml.match(re);
  if (!m) return '';
  return m[1].replace(/^<!\[CDATA\[/, '').replace(/\]\]>$/, '').trim();
}

// Lê o valor de um atributo (ex.: url="..." num <enclosure ... />).
function attr(xml: string, tagName: string, attrName: string): string {
  const re = new RegExp(`<${tagName}\\b[^>]*\\b${attrName}="([^"]+)"`, 'i');
  const m = xml.match(re);
  return m ? m[1] : '';
}

function slugFromLink(link: string, title: string): string {
  // Substack: .../p/o-titulo-do-post -> usa o ultimo segmento.
  try {
    const u = new URL(link);
    const seg = u.pathname.split('/').filter(Boolean).pop();
    if (seg) return seg;
  } catch {}
  return (
    title
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '') // remove acentos
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 80) || 'post'
  );
}

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&#\d+;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// Primeira imagem do corpo ou <enclosure> do item, para usar como capa.
function firstImage(item: string, body: string): string | null {
  const enc = attr(item, 'enclosure', 'url');
  if (enc && /\.(jpe?g|png|webp|gif|avif)/i.test(enc)) return enc;
  const m = body.match(/<img[^>]+src="([^"]+)"/i);
  return m ? m[1] : null;
}

// ~200 palavras/min de leitura, minimo 1 minuto.
function readingTime(text: string): number {
  const words = text.split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
}

export async function getSubstackPosts(): Promise<SubstackPost[]> {
  let xml = '';
  try {
    const res = await fetch(feedUrl(), {
      headers: { 'User-Agent': 'Mozilla/5.0 (heldergoncalves.io build)' },
    });
    if (!res.ok) {
      console.warn(`[substack] feed devolveu HTTP ${res.status}, a saltar.`);
      return [];
    }
    xml = await res.text();
  } catch (e) {
    console.warn('[substack] nao foi possivel obter o feed no build:', (e as Error).message);
    return [];
  }

  const items = xml.split(/<item>/i).slice(1).map((chunk) => chunk.split(/<\/item>/i)[0]);
  const posts: SubstackPost[] = [];

  for (const item of items) {
    const title = tag(item, 'title');
    const link = tag(item, 'link');
    if (!title || !link) continue;
    const rawDate = tag(item, 'pubDate');
    const pubDate = rawDate ? new Date(rawDate) : new Date(0);
    // content:encoded traz o corpo completo; description e o resumo.
    const body = tag(item, 'content:encoded');
    const rawDesc = tag(item, 'description');
    const plain = stripHtml(rawDesc || body);
    const description = plain.slice(0, 200);

    posts.push({
      slug: slugFromLink(link, title),
      title,
      description,
      pubDate,
      html: body,
      substackUrl: link,
      hasBody: body.trim().length > 0,
      cover: firstImage(item, body),
      readingMinutes: readingTime(stripHtml(body) || plain),
    });
  }

  posts.sort((a, b) => b.pubDate.valueOf() - a.pubDate.valueOf());
  return posts;
}
