// O e-mail de um artigo. Partilhado por `npm run enviar` e `npm run notificar`.
import { renderizar } from './md.mjs';

const esc = (s) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

const caminhoArtigo = (a) => (a.lang === 'pt' ? `/blog/${a.slug}` : `/en/blog/${a.slug}`);

const T = {
  pt: { ler: 'Ler no site', porque: 'Recebes isto porque subscreveste o blog de Hélder Gonçalves.', sair: 'Cancelar subscrição' },
  en: { ler: 'Read on the site', porque: 'You are receiving this because you subscribed to Hélder Gonçalves’s blog.', sair: 'Unsubscribe' },
};

/** @returns {{ assunto: string, html: string, text: string, url: string }} */
export function emailArtigo(a, site) {
  site = site.replace(/\/$/, '');
  const url = site + caminhoArtigo(a);
  const t = T[a.lang];
  const absolutos = (h) => h.replace(/(href|src)="\/(?!\/)/g, `$1="${site}/`);

  // E-mail é um sítio hostil ao CSS: estilos em linha e fontes seguras.
  const corpo = absolutos(renderizar(a.md))
    .replace(/<h2 /g, '<h2 style="font:400 26px/1.2 Georgia,serif;margin:34px 0 8px;color:#0a1224" ')
    .replace(/<p>/g, '<p style="margin:0 0 18px">')
    .replace(/<li>/g, '<li style="margin:0 0 8px">')
    .replace(/<a /g, '<a style="color:#b4491a" ')
    .replace(/<img /g, '<img style="max-width:100%;height:auto;border-radius:8px" ')
    .replace(/<blockquote>/g, '<blockquote style="margin:0 0 18px;padding-left:16px;border-left:2px solid #b4491a;color:#555;font-style:italic">');

  const html = `<!doctype html><html lang="${a.lang}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>${esc(a.titulo)}</title></head>
<body style="margin:0;background:#f4f1ec;padding:28px 12px">
<span style="display:none;max-height:0;overflow:hidden;opacity:0">${esc(a.resumo)}</span>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;background:#ffffff;border-radius:14px"><tr><td style="padding:40px 36px;font:18px/1.7 Georgia,'Times New Roman',serif;color:#15171d">
<p style="margin:0 0 22px;font:600 13px/1 -apple-system,Segoe UI,Helvetica,Arial,sans-serif;letter-spacing:.04em;color:#686b75">Hélder Gonçalves</p>
<h1 style="margin:0 0 14px;font:400 38px/1.08 Georgia,serif;letter-spacing:-.02em;color:#0a1224">${esc(a.titulo)}</h1>
<p style="margin:0 0 30px;font-style:italic;color:#686b75">${esc(a.resumo)}</p>
${corpo}
<p style="margin:34px 0 0"><a href="${url}" style="display:inline-block;background:#0a1224;color:#fff;text-decoration:none;font:500 15px/1 -apple-system,Segoe UI,Helvetica,Arial,sans-serif;padding:14px 22px;border-radius:10px">${t.ler} →</a></p>
</td></tr></table>
<p style="max-width:600px;margin:18px auto 0;text-align:center;font:13px/1.6 -apple-system,Segoe UI,Helvetica,Arial,sans-serif;color:#686b75">${t.porque}<br><a href="{{{RESEND_UNSUBSCRIBE_URL}}}" style="color:#686b75">${t.sair}</a></p>
</body></html>`;

  const text = `${a.titulo}\n\n${a.resumo}\n\n${t.ler}: ${url}\n\n— ${t.porque}\n${t.sair}: {{{RESEND_UNSUBSCRIBE_URL}}}`;
  return { assunto: a.titulo, html, text, url };
}
