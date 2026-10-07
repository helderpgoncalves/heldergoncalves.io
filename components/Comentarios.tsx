'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import type { Copy, Lang } from '@/lib/copy';
import type { ComentarioBlog } from '@/lib/comentarios';

type C = ComentarioBlog & { meu: boolean };
type Estado = 'parado' | 'a-enviar' | 'erro' | 'limite' | 'ligacoes';

const post = (url: string, corpo?: unknown) =>
  fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(corpo ?? {}) });

// Só carrega quando o leitor chega perto (zero custo para quem não desce até aqui). Só subscritores comentam:
// a sessão abre-se com uma ligação enviada ao e-mail subscrito (ver /api/comentarios/entrar).
export function Comentarios({ lang, slug, t }: { lang: Lang; slug: string; t: Copy['comentarios'] }) {
  const raiz = useRef<HTMLElement>(null);
  const [lista, setLista] = useState<C[] | null>(null);
  const [sessao, setSessao] = useState<{ nome: string } | null>(null);
  const [nome, setNome] = useState('');
  const [texto, setTexto] = useState('');
  const [pai, setPai] = useState<string | null>(null);
  const [estado, setEstado] = useState<Estado>('parado');
  const [entrar, setEntrar] = useState<'fechado' | 'aberto' | 'a-enviar' | 'ok' | 'invalido' | 'limite'>('fechado');

  useEffect(() => {
    const el = raiz.current!;
    let feito = false;
    const carregar = async () => {
      if (feito) return;
      feito = true;
      try {
        const r = await fetch(`/api/comentarios?slug=${encodeURIComponent(slug)}&lang=${lang}`);
        if (!r.ok) return;
        const d = (await r.json()) as { comentarios: C[]; sessao: { nome: string } | null };
        setLista(d.comentarios);
        setSessao(d.sessao);
        setNome(d.sessao?.nome ?? '');
      } catch { /* sem rede: fica por carregar */ }
    };
    const obs = new IntersectionObserver((e) => { if (e.some((x) => x.isIntersecting)) { obs.disconnect(); void carregar(); } }, { rootMargin: '600px 0px' });
    obs.observe(el);
    return () => obs.disconnect();
  }, [slug, lang]);

  async function publicar(e: FormEvent) {
    e.preventDefault();
    if (estado === 'a-enviar') return;
    setEstado('a-enviar');
    try {
      const r = await post('/api/comentarios', { slug, lang, nome, texto, pai });
      if (r.status === 201) {
        const { comentario } = (await r.json()) as { comentario: C };
        setLista((l) => [...(l ?? []), comentario]);
        setTexto(''); setPai(null); setEstado('parado');
        return;
      }
      if (r.status === 401) { setSessao(null); setEstado('parado'); return; }
      const erro = ((await r.json().catch(() => ({}))) as { erro?: string }).erro;
      setEstado(r.status === 429 ? 'limite' : erro === 'ligacoes' ? 'ligacoes' : 'erro');
    } catch { setEstado('erro'); }
  }

  async function apagar(id: string) {
    if (!confirm(t.apagarConfirma)) return;
    const r = await fetch(`/api/comentarios?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
    if (r.ok) setLista((l) => (l ?? []).filter((c) => c.id !== id && c.pai !== id));
  }

  async function pedirEntrada(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const email = new FormData(e.currentTarget).get('email-comentar');
    setEntrar('a-enviar');
    try {
      const r = await post('/api/comentarios/entrar', { email, lang });
      setEntrar(r.ok ? 'ok' : r.status === 400 ? 'invalido' : r.status === 429 ? 'limite' : 'invalido');
    } catch { setEntrar('invalido'); }
  }

  async function sair() { await post('/api/comentarios/sair'); setSessao(null); }

  const data = (iso: string) => new Intl.DateTimeFormat(lang === 'pt' ? 'pt-PT' : 'en-GB', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(iso));
  const topo = (lista ?? []).filter((c) => !c.pai);
  const respostas = (id: string) => (lista ?? []).filter((c) => c.pai === id);
  const alvo = pai ? lista?.find((c) => c.id === pai) : null;
  const campo = 'w-full rounded-xl border border-linha bg-transparent px-4 py-3 text-base text-tinta outline-none transition-colors placeholder:text-suave/70 hover:border-suave focus:border-tinta';

  const Cartao = ({ c, resposta }: { c: C; resposta?: boolean }) => (
    <li id={`c-${c.id}`} className={resposta ? 'mt-4 border-l border-linha pl-4' : 'border-b border-linha py-5'}>
      <p className="flex flex-wrap items-baseline gap-x-3 font-mono text-[0.74rem] text-suave">
        <span className="text-[0.95rem] font-medium text-tinta [font-family:var(--font-sans)]">{c.nome}</span>
        <time dateTime={c.criado}>{data(c.criado)}</time>
      </p>
      <p className="mt-1.5 font-leitura text-[1.08rem] leading-[1.6] break-words whitespace-pre-line text-pretty">{c.texto}</p>
      <p className="mt-2 flex gap-4 font-mono text-[0.74rem] text-suave">
        {sessao && !resposta && <button type="button" onClick={() => { setPai(c.id); document.getElementById('form-comentar')?.scrollIntoView({ block: 'center', behavior: 'smooth' }); }} className="hover:text-tinta">{t.responder}</button>}
        {c.meu && <button type="button" onClick={() => apagar(c.id)} className="hover:text-acento">{t.apagar}</button>}
      </p>
      {!resposta && respostas(c.id).length > 0 && <ul>{respostas(c.id).map((r) => <Cartao key={r.id} c={r} resposta />)}</ul>}
    </li>
  );

  return (
    <section ref={raiz} aria-labelledby="comentarios" className="mt-16">
      <h2 id="comentarios" className="font-mono text-[0.72rem] tracking-[0.14em] text-suave uppercase">
        {t.titulo}{lista && lista.length > 0 ? ` · ${(lista.length === 1 ? t.um : t.varios.replace('{n}', String(lista.length)))}` : ''}
      </h2>

      {lista && (topo.length === 0 ? <p className="mt-5 font-leitura text-lg text-suave">{t.vazio}</p> : <ul className="mt-2">{topo.map((c) => <Cartao key={c.id} c={c} />)}</ul>)}

      {lista && (
        <div className="mt-8 rounded-2xl border border-linha p-6 sm:p-7">
          {sessao ? (
            <form id="form-comentar" onSubmit={publicar} className="space-y-3">
              {alvo && (
                <p className="flex items-center justify-between font-mono text-[0.76rem] text-suave">
                  <span>{t.respostaA} {alvo.nome}</span>
                  <button type="button" onClick={() => setPai(null)} className="hover:text-tinta">{t.cancelar}</button>
                </p>
              )}
              <label className="block font-mono text-[0.72rem] tracking-[0.12em] text-suave uppercase">{t.nome}
                <input value={nome} onChange={(e) => setNome(e.target.value)} required minLength={2} maxLength={40} autoComplete="nickname" className={`${campo} mt-2 normal-case [font-family:var(--font-sans)] tracking-normal`} />
              </label>
              <label className="block font-mono text-[0.72rem] tracking-[0.12em] text-suave uppercase">{t.texto}
                <textarea value={texto} onChange={(e) => setTexto(e.target.value)} required minLength={2} maxLength={2000} rows={5} placeholder={t.placeholder} className={`${campo} mt-2 resize-y normal-case [font-family:var(--font-sans)] tracking-normal`} />
              </label>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p role="status" aria-live="polite" className="text-[0.88rem] text-suave">
                  {estado === 'erro' ? <span className="text-acento">{t.erro}</span> : estado === 'limite' ? <span className="text-acento">{t.limite}</span> : estado === 'ligacoes' ? <span className="text-acento">{t.ligacoes}</span> : t.regras}
                </p>
                <div className="flex items-center gap-4">
                  <button type="button" onClick={sair} className="font-mono text-[0.76rem] text-suave hover:text-tinta">{t.sair}</button>
                  <button type="submit" disabled={estado === 'a-enviar'} className="rounded-xl bg-tinta px-6 py-3 text-base font-medium text-fundo transition-opacity hover:opacity-90 disabled:opacity-50">{estado === 'a-enviar' ? t.aPublicar : t.publicar}</button>
                </div>
              </div>
            </form>
          ) : (
            <div>
              <p className="font-leitura text-[1.12rem] leading-[1.6] text-pretty">{t.soSubscritores}</p>
              <p className="mt-3 font-mono text-[0.78rem]">
                <a href="#subscrever" className="underline decoration-linha underline-offset-4 hover:text-acento">{lang === 'pt' ? 'Subscrever' : 'Subscribe'} ↑</a>
                <span className="mx-3 text-suave">·</span>
                <button type="button" onClick={() => setEntrar('aberto')} className="underline decoration-linha underline-offset-4 hover:text-acento">{t.jaSubscrevi}</button>
              </p>
              {entrar !== 'fechado' && (
                <form onSubmit={pedirEntrada} noValidate className="mt-5 flex flex-col gap-2.5 sm:flex-row">
                  <input name="email-comentar" type="email" inputMode="email" autoComplete="email" required maxLength={254} placeholder={lang === 'pt' ? 'o.teu@email.com' : 'your@email.com'} disabled={entrar === 'ok'} aria-label="E-mail" className={`${campo} min-w-0 flex-1`} />
                  <button type="submit" disabled={entrar === 'a-enviar' || entrar === 'ok'} className="rounded-xl bg-tinta px-6 py-3 text-base font-medium text-fundo disabled:opacity-50">{entrar === 'a-enviar' ? t.entrarAEnviar : t.entrarBotao}</button>
                </form>
              )}
              <p role="status" aria-live="polite" className="mt-3 min-h-[1.2rem] text-[0.92rem] text-acento">
                {entrar === 'ok' ? <span className="text-tinta">{t.entrarEnviado}</span> : entrar === 'invalido' ? t.entrarInvalido : entrar === 'limite' ? t.entrarLimite : null}
              </p>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
