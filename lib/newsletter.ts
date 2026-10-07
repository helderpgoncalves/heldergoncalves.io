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

type Tipo = 'subscrever' | 'publicar' | 'subscreverPublicar';

/** A carta de confirmação: a mesma casa nos três casos (subscrever, publicar, subscrever e publicar). */
function carta(lang: Lang, tipo: Tipo, link: string) {
  const { mail } = copy[lang];
  const m = mail[tipo];
  const paragrafos = m.texto.split('\n\n').map((p) => `<p class="t2" style="margin:0 0 18px;font-size:17px;line-height:1.65;color:#3a3f4b">${esc(p)}</p>`).join('');
  const sans = "-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif";
  const html = `<!doctype html><html lang="${lang}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light dark"><meta name="supported-color-schemes" content="light dark"><title>${esc(m.assunto)}</title>
<style>@media (prefers-color-scheme: dark){.fundo{background:#0a1020!important}.cartao{background:#121a2e!important}.t1{color:#eef1f7!important}.t2{color:#c4cad8!important}.t3{color:#8f97ab!important}.lk{color:#f4b36a!important}.linha{border-color:#222a3e!important}}@media (max-width:480px){.cartao{padding:30px 22px!important}.h1{font-size:27px!important}}</style></head>
<body class="fundo" style="margin:0;padding:0;background:#f4f1ec">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent">${esc(m.preheader)}${'&nbsp;&zwnj;'.repeat(40)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" class="fundo" style="background:#f4f1ec"><tr><td align="center" style="padding:36px 16px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:540px"><tr><td style="padding:0 6px 18px;font:600 13px/1 ${sans};letter-spacing:.06em;color:#6b7280" class="t3"><span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:#f4b36a;margin-right:8px"></span>${esc(SITE.nome.toUpperCase())}</td></tr></table>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" class="cartao" style="max-width:540px;background:#ffffff;border-radius:18px;padding:42px 38px"><tr><td>
<h1 class="h1 t1" style="margin:0 0 22px;font-family:Georgia,'Times New Roman',serif;font-size:32px;line-height:1.15;font-weight:400;letter-spacing:-.01em;color:#0a1224">${esc(m.titulo)}</h1>
<div class="t2" style="font-family:Georgia,'Times New Roman',serif">${paragrafos}</div>
<table role="presentation" cellpadding="0" cellspacing="0" style="margin:30px 0 26px"><tr><td style="border-radius:12px;background:#f4b36a"><a href="${link}" style="display:inline-block;padding:16px 28px;font:600 16px/1 ${sans};color:#0a1224;text-decoration:none;border-radius:12px">${esc(m.botao)} &rarr;</a></td></tr></table>
<p class="t3" style="margin:0 0 6px;font:13px/1.55 ${sans};color:#8a8f9c">${esc(m.fallback)}</p>
<p style="margin:0 0 30px;font:12px/1.5 ${sans};word-break:break-all"><a href="${link}" class="lk" style="color:#b4491a">${esc(link)}</a></p>
<p class="t2" style="margin:0;font-family:Georgia,'Times New Roman',serif;font-size:17px;line-height:1.5;color:#3a3f4b">${esc(mail.assinatura)}</p>
<p class="t1" style="margin:2px 0 0;font-family:Georgia,'Times New Roman',serif;font-style:italic;font-size:24px;line-height:1.3;color:#0a1224">Hélder</p>
</td></tr></table>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:540px"><tr><td class="t3" style="padding:22px 10px 0;font:12.5px/1.65 ${sans};color:#8a8f9c;text-align:center">${esc(mail.ignora)} ${esc(mail.rodape)}<br>${esc(mail.sobre)}</td></tr></table>
</td></tr></table></body></html>`;
  const text = `${m.titulo}\n\n${m.texto}\n${link}\n\n${mail.assinatura} Hélder\n\n${mail.ignora} ${mail.rodape}\n${mail.sobre}`;
  return { assunto: m.assunto, html, text };
}

async function enviarCarta(email: string, lang: Lang, tipo: Tipo, token: string): Promise<boolean> {
  // A ligação abre uma página com botão (POST), nunca confirma sozinha: os antivírus
  // e as pré-visualizações de e-mail abrem links, e não podem subscrever ninguém.
  const link = `${SITE.url}${rotas[lang].confirmar}?t=${encodeURIComponent(token)}`;
  const { assunto, html, text } = carta(lang, tipo, link);
  const r = await resend('/emails', 'POST', { from: process.env.RESEND_FROM, to: [email], subject: assunto, html, text });
  if (!r.ok) console.error(`[newsletter] Resend /emails respondeu ${r.status}`);
  return r.ok;
}

export const enviarConfirmacao = (email: string, lang: Lang) => enviarCarta(email, lang, 'subscrever', criarToken(email, lang));

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
export const enviarPublicacao = (email: string, lang: Lang, pendente: string, jaSubscrito: boolean) =>
  enviarCarta(email, lang, jaSubscrito ? 'publicar' : 'subscreverPublicar', criarToken(email, lang, 'p', HORAS, pendente));
