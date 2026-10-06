'use client';

import { useEffect, useState } from 'react';
import type { Comentario, Estado, Ponto } from '@/lib/microsoft/tipos';

const MAX_PONTOS = 600;
const MAX_COMENTARIOS = 100;

const juntar = (serie: Ponto[], p: Ponto): Ponto[] => {
  const ultimo = serie.at(-1);
  if (ultimo && ultimo[0] === p[0]) return [...serie.slice(0, -1), p];
  if (ultimo && p[0] < ultimo[0]) return serie;
  return [...serie, p].slice(-MAX_PONTOS);
};

// As mensagens ficam da mais antiga para a mais recente, como num chat.
const comentariosCom = (lista: Comentario[], c: Comentario) =>
  lista.some((x) => x.id === c.id) ? lista : [...lista, c].slice(-MAX_COMENTARIOS);

/**
 * Mantém o estado actualizado por Server-Sent Events. Se a ligação cair, o browser volta a abrir-se
 * sozinho e, entretanto, vamos buscar o estado a cada 10 s. Com o separador escondido, fecha a ligação.
 */
export function useTempoReal(inicial: Estado) {
  const [estado, setEstado] = useState(inicial);
  const [ligado, setLigado] = useState(false);

  useEffect(() => {
    let es: EventSource | null = null;
    let sondagem: number | undefined;

    const buscar = async () => {
      try {
        const r = await fetch('/api/estado', { cache: 'no-store' });
        if (r.ok) setEstado((await r.json()) as Estado);
      } catch { /* sem rede: fica o que havia */ }
    };
    const parar = () => { clearInterval(sondagem); sondagem = undefined; };
    const dados = (e: Event) => JSON.parse((e as MessageEvent<string>).data);

    const abrir = () => {
      es = new EventSource('/api/stream');
      es.onopen = () => { setLigado(true); parar(); };
      es.onerror = () => { setLigado(false); sondagem ??= window.setInterval(buscar, 10_000); };
      es.addEventListener('estado', (e) => setEstado(dados(e)));
      es.addEventListener('cotacao', (e) => {
        const { ponto, ...resto } = dados(e);
        setEstado((p) => (p.cotacao ? { ...p, cotacao: { ...p.cotacao, ...resto, serie: ponto ? juntar(p.cotacao.serie, ponto) : p.cotacao.serie } } : p));
      });
      es.addEventListener('comentario', (e) => setEstado((p) => ({ ...p, comentarios: comentariosCom(p.comentarios, dados(e)) })));
      es.addEventListener('removido', (e) => setEstado((p) => ({ ...p, comentarios: p.comentarios.filter((c) => c.id !== dados(e).id) })));
      es.addEventListener('reacao', (e) => { const d = dados(e); setEstado((p) => ({ ...p, comentarios: p.comentarios.map((c) => (c.id === d.id ? { ...c, reacoes: d.reacoes } : c)) })); });
      es.addEventListener('online', (e) => setEstado((p) => ({ ...p, online: dados(e).n })));
    };

    const visibilidade = () => {
      if (document.hidden) { es?.close(); es = null; setLigado(false); parar(); }
      else if (!es) { abrir(); void buscar(); }
    };

    abrir();
    document.addEventListener('visibilitychange', visibilidade);
    return () => { document.removeEventListener('visibilitychange', visibilidade); es?.close(); parar(); };
  }, []);

  // O que o próprio utilizador faz aparece logo, sem esperar pelo eco do servidor.
  const acoes = {
    adicionar: (c: Comentario) => setEstado((p) => ({ ...p, comentarios: comentariosCom(p.comentarios, c) })),
    remover: (id: string) => setEstado((p) => ({ ...p, comentarios: p.comentarios.filter((c) => c.id !== id) })),
    reacoes: (id: string, reacoes: Record<string, number>) => setEstado((p) => ({ ...p, comentarios: p.comentarios.map((c) => (c.id === id ? { ...c, reacoes } : c)) })),
  };
  return { estado, ligado, acoes };
}
