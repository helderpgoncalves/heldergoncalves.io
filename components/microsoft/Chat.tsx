'use client';

import { useCallback, useEffect, useLayoutEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react';
import { corCss } from '@/lib/microsoft/chat';
import type { Comentario } from '@/lib/microsoft/tipos';
import { Mensagem } from './Mensagem';
import { Perfil, PerfilBalao } from './Perfil';
import { useIdentidade } from './useIdentidade';

const MENSAGENS: Record<string, string> = {
  nome: 'O nickname tem 2 a 24 letras, números ou . _ - \'',
  reservado: 'Esse nickname é reservado. Escolhe outro.',
  texto: 'Escreve alguma coisa (até 280 caracteres).',
  ligacoes: 'Sem ligações, por favor.',
  limite: 'Calma! Espera uns segundos antes de escrever outra vez.',
  repetido: 'Já disseste exactamente isso.',
  indisponivel: 'O chat está em baixo. Tenta daqui a pouco.',
};

type Props = {
  comentarios: Comentario[];
  online: number;
  ligado: boolean;
  acoes: { adicionar: (c: Comentario) => void; remover: (id: string) => void; reacoes: (id: string, r: Record<string, number>) => void };
};

export function Chat({ comentarios, online, ligado, acoes }: Props) {
  const id = useIdentidade();
  const [texto, setTexto] = useState('');
  const [aEnviar, setAEnviar] = useState(false);
  const [erro, setErro] = useState('');
  const [perfilAberto, setPerfilAberto] = useState(false);
  const [espreitar, setEspreitar] = useState(false); // quem ainda não entrou pode só ler
  const [agora, setAgora] = useState<number | null>(null);
  const [novas, setNovas] = useState(0);

  const lista = useRef<HTMLDivElement>(null);
  const caixa = useRef<HTMLTextAreaElement>(null);
  const perto = useRef(true);        // o utilizador está a ver o fim da conversa
  const vistas = useRef(0);
  const minhaUltima = useRef(false); // a mensagem que acabou de chegar é minha

  useEffect(() => {
    setAgora(Date.now());
    const t = setInterval(() => setAgora(Date.now()), 30_000);
    return () => clearInterval(t);
  }, []);

  const paraOFim = useCallback((suave: boolean) => {
    const el = lista.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: suave ? 'smooth' : 'auto' });
    setNovas(0);
  }, []);

  // Mensagem nova: desce sozinho se estavas a ver o fim (ou se a escreveste tu); senão, avisa.
  useLayoutEffect(() => {
    const antes = vistas.current;
    vistas.current = comentarios.length;
    if (antes === 0) return paraOFim(false);
    if (comentarios.length > antes) {
      if (perto.current || minhaUltima.current) paraOFim(true);
      else setNovas((n) => n + (comentarios.length - antes));
    }
    minhaUltima.current = false;
  }, [comentarios.length, paraOFim]);

  const aoRolar = () => {
    const el = lista.current;
    if (!el) return;
    perto.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
    if (perto.current) setNovas(0);
  };

  async function enviar(e?: FormEvent) {
    e?.preventDefault();
    if (aEnviar || !texto.trim()) return;
    setAEnviar(true); setErro('');
    try {
      const r = await fetch('/api/comentarios', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nome: id.nome, texto, avatar: id.avatar, cor: id.cor, website: '' }),
      });
      const j = (await r.json().catch(() => ({}))) as { erro?: string; comentario?: Comentario; segredo?: string };
      if (r.ok && j.comentario) {
        minhaUltima.current = true;
        if (j.segredo) id.guardarSegredo(j.comentario.id, j.segredo);
        acoes.adicionar(j.comentario);
        setTexto('');
        caixa.current?.focus();
      } else {
        setErro(MENSAGENS[j.erro ?? ''] ?? 'Não consegui enviar. Tenta outra vez.');
        if (j.erro === 'nome' || j.erro === 'reservado') setPerfilAberto(true);
      }
    } catch {
      setErro('Sem ligação. Tenta outra vez.');
    } finally {
      setAEnviar(false);
    }
  }

  // Enter envia; Shift+Enter muda de linha (e nunca a meio de uma composição de teclado).
  const aoTeclar = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); void enviar(); }
  };

  async function reagir(c: Comentario, emoji: string) {
    if (!id.cliente) return;
    const ligar = !(id.minhas[c.id] ?? []).includes(emoji);
    const antes = c.reacoes;
    const n = Math.max(0, (antes[emoji] ?? 0) + (ligar ? 1 : -1));
    const otimista = { ...antes, [emoji]: n };
    if (!n) delete otimista[emoji];
    acoes.reacoes(c.id, otimista);
    id.marcarReacao(c.id, emoji, ligar);
    try {
      const r = await fetch(`/api/comentarios/${c.id}/reacao`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ emoji, cliente: id.cliente, ligar }) });
      const j = (await r.json().catch(() => ({}))) as { reacoes?: Record<string, number> };
      if (!r.ok) throw new Error();
      if (j.reacoes) acoes.reacoes(c.id, j.reacoes);
    } catch { // não pegou: volta atrás
      acoes.reacoes(c.id, antes);
      id.marcarReacao(c.id, emoji, !ligar);
    }
  }

  async function apagar(c: Comentario) {
    const segredo = id.segredos[c.id];
    if (!segredo) return;
    const r = await fetch(`/api/comentarios/${c.id}`, { method: 'DELETE', headers: { 'X-Segredo': segredo } }).catch(() => null);
    if (r?.ok || r?.status === 404) { acoes.remover(c.id); id.esquecerSegredo(c.id); }
  }

  const fecharPerfil = useCallback(() => setPerfilAberto(false), []);
  const entrar = id.carregado && !id.pronto && !espreitar;

  return (
    <section aria-labelledby="t-chat" className="@container flex h-full min-h-0 flex-col overflow-hidden rounded-3xl border border-white/10 bg-white/[0.025]">
      <header className="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-3 @[28rem]:px-5 @[28rem]:py-3.5">
        <h2 id="t-chat" className="font-serif text-[1.7rem] leading-none tracking-[-0.02em]">A selva <span aria-hidden>🦍</span></h2>
        <p className="flex items-center gap-2 font-mono text-[0.72rem] text-nevoa/55">
          <span aria-hidden className={`h-1.5 w-1.5 rounded-full ${ligado ? 'bg-[#34d399]' : 'bg-[#fbbf24]'}`} />
          {ligado ? `${Math.max(1, online)} ${online === 1 ? 'macaco online' : 'macacos online'}` : 'a reconectar…'}
        </p>
      </header>

      <div className="relative min-h-0 flex-1">
        <div ref={lista} onScroll={aoRolar} role="log" aria-live="polite" aria-relevant="additions" tabIndex={0} aria-label="Mensagens" className="h-full overflow-y-auto overscroll-contain px-4 py-4 @[28rem]:px-5">
          {comentarios.length === 0 ? (
            <p className="grid h-full place-items-center text-center text-nevoa/45">A selva está em silêncio.<br />Sê o primeiro macaco a falar. 🍌</p>
          ) : (
            <ol className="space-y-3.5">
              {comentarios.map((c) => (
                <Mensagem
                  key={c.id} c={c} agora={agora} minhas={id.minhas[c.id] ?? []} meu={Boolean(id.segredos[c.id])}
                  aoReagir={(e) => void reagir(c, e)} aoApagar={() => void apagar(c)}
                />
              ))}
            </ol>
          )}
        </div>

        {novas > 0 && (
          <button type="button" onClick={() => paraOFim(true)} className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-nevoa px-4 py-1.5 font-mono text-[0.78rem] text-noite shadow-[0_8px_30px_-6px_#000]">
            ↓ {novas} {novas === 1 ? 'mensagem nova' : 'mensagens novas'}
          </button>
        )}

        {/* A primeira vez: escolhes o nome e o avatar, e nunca mais te pergunto. */}
        {entrar && (
          <div role="dialog" aria-label="Entrar na selva" className="absolute inset-0 z-10 overflow-y-auto bg-[#070a14]/90 p-4 backdrop-blur-sm">
            <div className="mx-auto grid min-h-full max-w-sm content-center gap-4 py-2">
              <div>
                <h3 className="font-serif text-[1.9rem] leading-none tracking-[-0.02em]">Entra na selva <span aria-hidden>🦍</span></h3>
                <p className="mt-2 text-[0.95rem] text-nevoa/60">Escolhe um nome e um avatar. Só precisas de o fazer uma vez.</p>
              </div>
              <Perfil key="entrar" inicial={{ nome: id.nome, avatar: id.avatar, cor: id.cor }} botao="Entrar 🚀" aoGuardar={id.definir} />
              <button type="button" onClick={() => setEspreitar(true)} className="justify-self-center font-mono text-[0.78rem] text-nevoa/45 underline-offset-4 transition-colors hover:text-nevoa hover:underline">só espreitar</button>
            </div>
          </div>
        )}
      </div>

      {!entrar && (
      <div className="border-t border-white/10 p-3">
        {!id.carregado ? (
          <div className="h-11" />
        ) : id.pronto ? (
          <div>
            <p role="status" aria-live="polite" className="px-1 pb-1.5 text-[0.85rem] empty:hidden text-[#fb7185]">{erro}</p>
            <div className="flex items-end gap-2">
              {/* O perfil fica fora do <form> de envio: formulários dentro de formulários não existem em HTML. */}
              <div className="relative shrink-0">
                <button
                  type="button" onClick={() => setPerfilAberto((p) => !p)} aria-expanded={perfilAberto} aria-label={`O teu perfil: ${id.nome}. Mudar nome ou avatar`} title={id.nome}
                  className="grid h-11 w-11 place-items-center rounded-full text-[1.4rem] transition-transform hover:scale-105 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nevoa"
                  style={{ background: corCss(id.cor) }}
                >{id.avatar}</button>
                {perfilAberto && <PerfilBalao inicial={{ nome: id.nome, avatar: id.avatar, cor: id.cor }} botao="Guardar" aoGuardar={(n, a, c) => { id.definir(n, a, c); setPerfilAberto(false); }} aoFechar={fecharPerfil} />}
              </div>
              <form onSubmit={enviar} className="flex min-w-0 flex-1 items-end gap-2">
                <textarea
                  ref={caixa} value={texto} onChange={(e) => setTexto(e.target.value)} onKeyDown={aoTeclar} maxLength={280} rows={1} aria-label="Mensagem" placeholder="Fala com a selva…" enterKeyHint="send"
                  className="max-h-32 min-h-11 min-w-0 flex-1 resize-none rounded-3xl border border-white/12 bg-white/[0.04] px-4 py-2.5 text-base leading-snug outline-none transition-colors placeholder:text-nevoa/35 focus:border-nevoa/50 [field-sizing:content]"
                />
                <button
                  type="submit" disabled={aEnviar || !texto.trim()} aria-label="Enviar"
                  className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-nevoa text-[1.2rem] text-noite transition-[opacity,scale] hover:scale-105 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nevoa disabled:scale-100 disabled:opacity-35"
                >{aEnviar ? '…' : '🚀'}</button>
              </form>
            </div>
            <p className="mt-1.5 flex justify-between px-1 font-mono text-[0.66rem] text-nevoa/35">
              <span className="hidden [@media(hover:hover)]:inline">Enter envia · Shift+Enter nova linha</span>
              {[...texto].length >= 200 && <span className="ml-auto tabular-nums">{[...texto].length}/280</span>}
            </p>
          </div>
        ) : (
          <button type="button" onClick={() => setEspreitar(false)} className="h-11 w-full rounded-full bg-nevoa font-medium text-noite transition-[translate] hover:-translate-y-px focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nevoa">Entrar para falar 🚀</button>
        )}
      </div>
      )}
    </section>
  );
}
