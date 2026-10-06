// Envia um artigo como newsletter, à mão. (O aviso automático é o `notificar`.)
//
//   npm run enviar -- <slug> [--lang pt|en] [--ver | --agora]
//
//   (sem opção)  cria o broadcast como RASCUNHO no Resend, para reveres no painel
//   --ver        só mostra o HTML, não toca no Resend
//   --agora      cria e envia já, para todo o segmento dessa língua
import { artigo } from '../lib/md.mjs';
import { emailArtigo } from '../lib/email.mjs';

const args = process.argv.slice(2);
const slug = args.find((a) => !a.startsWith('--') && a !== args[args.indexOf('--lang') + 1]);
const lang = args.includes('--lang') ? args[args.indexOf('--lang') + 1] : 'pt';
const sair = (msg) => { console.error(`✗ ${msg}`); process.exit(1); };

if (!slug) sair('Falta o slug. Ex.: npm run enviar -- a-licao-amarga --lang pt');
if (lang !== 'pt' && lang !== 'en') sair('--lang tem de ser pt ou en');
const a = artigo(lang, slug);
if (!a) sair(`Não encontrei content/${lang}/${slug}.md (ou está marcado como rascunho).`);

const { assunto, html, text } = emailArtigo(a, process.env.SITE_URL ?? 'https://heldergoncalves.io');
if (args.includes('--ver')) { console.log(html); process.exit(0); }

const segmento = lang === 'pt' ? process.env.RESEND_SEGMENT_PT : process.env.RESEND_SEGMENT_EN;
for (const [k, v] of [['RESEND_API_KEY', process.env.RESEND_API_KEY], ['RESEND_FROM', process.env.RESEND_FROM], [`RESEND_SEGMENT_${lang.toUpperCase()}`, segmento]]) {
  if (!v) sair(`Falta ${k} (define-o em .env.local).`);
}

const agora = args.includes('--agora');
const r = await fetch(`${process.env.RESEND_API_URL ?? 'https://api.resend.com'}/broadcasts`, {
  method: 'POST',
  headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({ segment_id: segmento, from: process.env.RESEND_FROM, subject: assunto, name: `artigo:${lang}:${a.slug}`, html, text, send: agora }),
});
const j = await r.json().catch(() => ({}));
if (!r.ok) sair(`Resend respondeu ${r.status}: ${j.message ?? JSON.stringify(j)}`);
console.log(agora ? `✓ Enviado. Broadcast ${j.id}` : `✓ Rascunho criado no Resend (${j.id}). Revê e envia no painel, ou repete com --agora.`);
