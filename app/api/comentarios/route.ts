import type { NextRequest } from 'next/server';
import { dentroDoLimite, ipDe, json, lerJson, origemPermitida } from '@/lib/api';
import { artigo } from '@/lib/blog';
import { MAX_NOME, MAX_TEXTO, criar, doTexto, guardarPendente, remover } from '@/lib/comentarios';
import { COOKIE, configurado, eSubscritor, emailValido, enviarPublicacao, idDe, lerSessao, sessaoComNome } from '@/lib/newsletter';
import type { Lang } from '@/lib/copy';

const lingua = (v: unknown): Lang => (v === 'en' ? 'en' : 'pt');
// Sem caracteres de controlo, espaços repetidos nem < >: o React já escapa, isto é só higiene.
const limpar = (s: string, multilinha = false) =>
  s.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F​-‏‪-‮⁦-⁩]/g, '').replace(multilinha ? /[ \t]+/g : /\s+/g, ' ').replace(/\n{3,}/g, '\n\n').replace(/[<>]/g, '').trim();

export async function GET(req: NextRequest) {
  const slug = req.nextUrl.searchParams.get('slug') ?? '';
  const lang = lingua(req.nextUrl.searchParams.get('lang'));
  if (!artigo(lang, slug)) return json({ erro: 'nao-existe' }, 404);
  const s = lerSessao(req.cookies.get(COOKIE)?.value);
  return json({ comentarios: await doTexto(lang, slug, s?.h ?? null), sessao: s ? { nome: s.n ?? '' } : null });
}

export async function POST(req: NextRequest) {
  if (!origemPermitida(req)) return json({ erro: 'origem' }, 403);
  const s = lerSessao(req.cookies.get(COOKIE)?.value);

  const corpo = await lerJson(req, 6000);
  if ('estado' in corpo) return json({ erro: 'invalido' }, corpo.estado);
  const d = corpo.dados;
  const lang = lingua(d.lang);
  const slug = typeof d.slug === 'string' ? d.slug : '';
  if (!artigo(lang, slug)) return json({ erro: 'nao-existe' }, 404);

  const nome = limpar(typeof d.nome === 'string' ? d.nome : s?.n ?? '').slice(0, MAX_NOME);
  const texto = limpar(typeof d.texto === 'string' ? d.texto : '', true);
  if (nome.length < 2 || texto.length < 2 || texto.length > MAX_TEXTO) return json({ erro: 'invalido' }, 400);
  if (/https?:\/\/|www\./i.test(nome)) return json({ erro: 'invalido' }, 400);
  if ((texto.match(/https?:\/\//gi) ?? []).length > 2) return json({ erro: 'ligacoes' }, 400);
  const pai = typeof d.pai === 'string' ? d.pai : null;

  // Sem sessão: o comentário fica à espera. A ligação enviada ao e-mail subscreve (se preciso) e publica-o.
  if (!s) {
    // Isco para robôs: um campo escondido que uma pessoa nunca preenche.
    if (typeof d.website === 'string' && d.website.trim() !== '') return json({ ok: true, pendente: true }, 202);
    const email = typeof d.email === 'string' ? d.email.trim().toLowerCase() : '';
    if (!emailValido(email)) return json({ erro: 'email' }, 400);
    if (!dentroDoLimite(`pend-ip:${ipDe(req)}`, 6, 10 * 60_000) || !dentroDoLimite(`pend:${email}`, 3, 60 * 60_000)) return json({ erro: 'limite' }, 429);
    if (!configurado(lang)) return json({ erro: 'indisponivel' }, 503);
    const id = await guardarPendente({ slug, lang, nome, texto, pai, h: idDe(email) });
    // A resposta é a mesma quer o e-mail já esteja subscrito ou não: ninguém descobre quem está na lista.
    const enviado = await enviarPublicacao(email, lang, id, await eSubscritor(email)).catch(() => false);
    return enviado ? json({ ok: true, pendente: true }, 202) : json({ erro: 'envio' }, 502);
  }

  if (!dentroDoLimite(`com:${s.h}`, 1, 20_000) || !dentroDoLimite(`com10:${s.h}`, 6, 10 * 60_000) || !dentroDoLimite(`comip:${ipDe(req)}`, 20, 60 * 60_000)) return json({ erro: 'limite' }, 429);

  const c = await criar({ lang, slug, nome, texto, pai, h: s.h });
  const r = json({ comentario: c }, 201);
  if (s.n !== nome) { // lembra o nome para a próxima vez
    const { valor, segundos } = sessaoComNome(s, nome);
    r.cookies.set(COOKIE, valor, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/', maxAge: segundos });
  }
  return r;
}

export async function DELETE(req: NextRequest) {
  if (!origemPermitida(req)) return json({ erro: 'origem' }, 403);
  const id = req.nextUrl.searchParams.get('id') ?? '';
  const token = process.env.COMENTARIOS_ADMIN_TOKEN;
  const admin = Boolean(token && token.length >= 24 && req.headers.get('authorization') === `Bearer ${token}`);
  const s = lerSessao(req.cookies.get(COOKIE)?.value);
  if (!s && !admin) return json({ erro: 'sessao' }, 401);
  return (await remover(id, s?.h ?? null, admin)) ? json({ ok: true }) : json({ erro: 'nao-existe' }, 404);
}
