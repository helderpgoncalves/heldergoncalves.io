import { createHmac, timingSafeEqual } from 'node:crypto';
import { copy, rotas, type Lang } from './copy';
import { SITE } from './site';

const API = process.env.RESEND_API_URL ?? 'https://api.resend.com';
const HORAS = 48;

// Cada língua tem o seu segmento no Resend, para a carta chegar na língua de quem a pediu.
const segmento = (lang: Lang) => (lang === 'pt' ? process.env.RESEND_SEGMENT_PT : process.env.RESEND_SEGMENT_EN);

// O segredo assina os tokens: com menos de 32 caracteres recusamos arrancar a newsletter.
export const configurado = (lang: Lang) =>
  Boolean(
    process.env.RESEND_API_KEY && process.env.RESEND_FROM && segmento(lang) &&
    process.env.NEWSLETTER_SECRET && process.env.NEWSLETTER_SECRET.length >= 32,
  );

/* ---------- Token assinado: a confirmação não precisa de base de dados ---------- */

type Carga = { e: string; l: Lang; x: number; k?: 's' | 'p'; p?: string }; // k: 's' subscrever (por omissão), 'p' subscrever e publicar o comentário pendente `p`
const b64 = (b: Buffer | string) => Buffer.from(b).toString('base64url');
const assinar = (dados: string) => createHmac('sha256', process.env.NEWSLETTER_SECRET!).update(dados).digest();

function criarToken(email: string, lang: Lang, k: 's' | 'p' = 's', horas = HORAS, p?: string): string {
  const carga = b64(JSON.stringify({ e: email, l: lang, x: Date.now() + horas * 3600_000, k, ...(p && { p }) } satisfies Carga));
  return `${carga}.${b64(assinar(carga))}`;
}

export function lerToken(token: string): Carga | null {
  const [carga, sig] = token.split('.');
  if (!carga || !sig) return null;
  const esperado = assinar(carga);
  const recebido = Buffer.from(sig, 'base64url');
  if (recebido.length !== esperado.length || !timingSafeEqual(recebido, esperado)) return null;
  try {
    const c = JSON.parse(Buffer.from(carga, 'base64url').toString()) as Carga;
    if (typeof c.e !== 'string' || (c.l !== 'pt' && c.l !== 'en') || c.x < Date.now()) return null;
    return { ...c, k: c.k === 'p' ? 'p' : 's', p: typeof c.p === 'string' ? c.p : undefined };
  } catch {
    return null;
  }
}

/* ---------- Validação ---------- */

export const emailValido = (e: string) => e.length <= 254 && /^[^\s@<>()"]+@[^\s@<>()"]+\.[^\s@<>()"]{2,}$/.test(e);

/* ---------- Resend ---------- */

async function resend(caminho: string, metodo: 'POST' | 'PATCH' | 'GET', corpo?: unknown, extra: Record<string, string> = {}) {
  return fetch(`${API}${caminho}`, {
    method: metodo,
    headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json', ...extra },
    ...(corpo !== undefined && { body: JSON.stringify(corpo) }),
    signal: AbortSignal.timeout(10_000),
  });
}

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);

export async function enviarConfirmacao(email: string, lang: Lang): Promise<boolean> {
  const m = copy[lang].mail;
  // A ligação abre uma página com botão (POST), nunca confirma sozinha: os antivírus
  // e as pré-visualizações de e-mail abrem links, e não podem subscrever ninguém.
  const link = `${SITE.url}${rotas[lang].confirmar}?t=${encodeURIComponent(criarToken(email, lang))}`;
  const html = `<!doctype html><html lang="${lang}"><body style="margin:0;background:#f4f1ec;padding:32px 16px;font-family:Georgia,'Times New Roman',serif;color:#0a1224">
<table role="presentation" width="100%" style="max-width:520px;margin:0 auto;background:#fff;border-radius:14px;padding:36px 32px"><tr><td>
<p style="margin:0 0 6px;font:600 13px/1 -apple-system,Segoe UI,Helvetica,Arial,sans-serif;letter-spacing:.04em;color:#6b7280">${esc(SITE.nome)}</p>
<h1 style="margin:14px 0 14px;font-size:28px;line-height:1.15;font-weight:500">${esc(m.titulo)}</h1>
<p style="margin:0 0 26px;font-size:17px;line-height:1.6;color:#374151">${esc(m.texto)}</p>
<p style="margin:0 0 28px"><a href="${link}" style="display:inline-block;background:#0a1224;color:#fff;text-decoration:none;font:500 15px/1 -apple-system,Segoe UI,Helvetica,Arial,sans-serif;padding:14px 22px;border-radius:10px">${esc(m.botao)}</a></p>
<p style="margin:0;font:14px/1.6 -apple-system,Segoe UI,Helvetica,Arial,sans-serif;color:#6b7280">${esc(m.ignora)} ${esc(m.rodape)}</p>
</td></tr></table></body></html>`;
  const text = `${m.titulo}\n\n${m.texto}\n${link}\n\n${m.ignora} ${m.rodape}`;
  const r = await resend('/emails', 'POST', { from: process.env.RESEND_FROM, to: [email], subject: m.assunto, html, text });
  if (!r.ok) console.error(`[newsletter] Resend /emails respondeu ${r.status}`);
  return r.ok;
}

/** Cria o contacto no segmento; se já existir, garante que volta a estar subscrito. */
export async function adicionarContacto(email: string, lang: Lang): Promise<boolean> {
  const id = segmento(lang)!;
  const novo = await resend('/contacts', 'POST', { email, unsubscribed: false, segments: [{ id }] });
  if (novo.ok) return true;
  const atual = await resend(`/contacts/${encodeURIComponent(email)}`, 'PATCH', { unsubscribed: false });
  if (!atual.ok) return false;
  await resend(`/contacts/${encodeURIComponent(email)}/segments/${id}`, 'POST', {}).catch(() => {});
  return true;
}

/* ---------- Comentários: publicar exige e-mail confirmado (e subscrito) ---------- */

/** Está subscrito (existe no Resend e não cancelou)? Em caso de dúvida, não. */
export async function eSubscritor(email: string): Promise<boolean> {
  const r = await resend(`/contacts/${encodeURIComponent(email)}`, 'GET').catch(() => null);
  if (!r?.ok) return false;
  const c = (await r.json().catch(() => null)) as { unsubscribed?: boolean } | null;
  return Boolean(c) && c!.unsubscribed !== true;
}

/* ---------- Sessão de quem comenta: um cookie assinado, sem guardar o e-mail ---------- */

export const COOKIE = 'hg_c';
const DIAS = 60;
type Sessao = { h: string; x: number; n?: string };

/** Identificador estável e anónimo de um e-mail (HMAC): serve para saber quem escreveu o quê sem guardar o endereço. */
export const idDe = (email: string) => createHmac('sha256', `id:${process.env.NEWSLETTER_SECRET}`).update(email.trim().toLowerCase()).digest('hex').slice(0, 32);

export function criarSessao(email: string, nome?: string): { valor: string; segundos: number } {
  const carga = b64(JSON.stringify({ h: idDe(email), x: Date.now() + DIAS * 86_400_000, ...(nome && { n: nome }) } satisfies Sessao));
  return { valor: `${carga}.${b64(assinar(carga))}`, segundos: DIAS * 86_400 };
}

export function lerSessao(valor: string | undefined): Sessao | null {
  if (!valor) return null;
  const [carga, sig] = valor.split('.');
  if (!carga || !sig || !process.env.NEWSLETTER_SECRET) return null;
  const esperado = assinar(carga);
  const recebido = Buffer.from(sig, 'base64url');
  if (recebido.length !== esperado.length || !timingSafeEqual(recebido, esperado)) return null;
  try {
    const s = JSON.parse(Buffer.from(carga, 'base64url').toString()) as Sessao;
    return typeof s.h === 'string' && s.x > Date.now() ? s : null;
  } catch { return null; }
}

/** A mesma sessão (mesmo identificador e mesma validade) com um nome guardado. */
export function sessaoComNome(s: { h: string; x: number }, nome: string): { valor: string; segundos: number } {
  const carga = b64(JSON.stringify({ h: s.h, x: s.x, n: nome } satisfies Sessao));
  return { valor: `${carga}.${b64(assinar(carga))}`, segundos: Math.max(60, Math.floor((s.x - Date.now()) / 1000)) };
}

/** O e-mail «confirma e publica»: a ligação subscreve (se ainda não estiver) e publica o comentário pendente. */
export async function enviarPublicacao(email: string, lang: Lang, pendente: string, jaSubscrito: boolean): Promise<boolean> {
  const m = copy[lang].mail[jaSubscrito ? 'publicar' : 'subscreverPublicar'];
  const link = `${SITE.url}${rotas[lang].confirmar}?t=${encodeURIComponent(criarToken(email, lang, 'p', HORAS, pendente))}`;
  const html = `<!doctype html><html lang="${lang}"><body style="margin:0;background:#f4f1ec;padding:32px 16px;font-family:Georgia,'Times New Roman',serif;color:#0a1224">
<table role="presentation" width="100%" style="max-width:520px;margin:0 auto;background:#fff;border-radius:14px;padding:36px 32px"><tr><td>
<p style="margin:0 0 6px;font:600 13px/1 -apple-system,Segoe UI,Helvetica,Arial,sans-serif;letter-spacing:.04em;color:#6b7280">${esc(SITE.nome)}</p>
<h1 style="margin:14px 0 14px;font-size:28px;line-height:1.15;font-weight:500">${esc(m.titulo)}</h1>
<p style="margin:0 0 26px;font-size:17px;line-height:1.6;color:#374151">${esc(m.texto)}</p>
<p style="margin:0 0 28px"><a href="${link}" style="display:inline-block;background:#0a1224;color:#fff;text-decoration:none;font:500 15px/1 -apple-system,Segoe UI,Helvetica,Arial,sans-serif;padding:14px 22px;border-radius:10px">${esc(m.botao)}</a></p>
<p style="margin:0;font:14px/1.6 -apple-system,Segoe UI,Helvetica,Arial,sans-serif;color:#6b7280">${esc(copy[lang].mail.ignora)} ${esc(copy[lang].mail.rodape)}</p>
</td></tr></table></body></html>`;
  const r = await resend('/emails', 'POST', { from: process.env.RESEND_FROM, to: [email], subject: m.assunto, html, text: `${m.titulo}\n\n${m.texto}\n${link}\n\n${copy[lang].mail.ignora} ${copy[lang].mail.rodape}` });
  if (!r.ok) console.error(`[comentarios] Resend /emails respondeu ${r.status}`);
  return r.ok;
}
