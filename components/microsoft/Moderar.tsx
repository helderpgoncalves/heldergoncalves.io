'use client';

import { useCallback, useEffect, useState } from 'react';
import type { Comentario, Estado } from '@/lib/microsoft/tipos';
import { ha } from './formato';

// Só tu: o token fica apenas nesta sessão do browser (sessionStorage) e vai no cabeçalho de cada apagar.
export function Moderar() {
  const [token, setToken] = useState('');
  const [lista, setLista] = useState<Comentario[]>([]);
  const [erro, setErro] = useState('');

  useEffect(() => { try { setToken(sessionStorage.getItem('msft-admin') ?? ''); } catch { /* sem armazenamento */ } }, []);

  const carregar = useCallback(async () => {
    const r = await fetch('/api/estado', { cache: 'no-store' });
    if (r.ok) setLista(((await r.json()) as Estado).comentarios.reverse());
  }, []);
  useEffect(() => { void carregar(); }, [carregar]);

  async function apagar(id: string) {
    setErro('');
    try { sessionStorage.setItem('msft-admin', token); } catch { /* idem */ }
    const r = await fetch(`/api/comentarios/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
    if (r.ok) setLista((l) => l.filter((c) => c.id !== id));
    else setErro(r.status === 401 ? 'Token inválido.' : 'Não consegui apagar.');
  }

  return (
    <div className="mx-auto max-w-[44rem] px-5 py-12 [--p-acento:#aab8ff]">
      <h1 className="font-serif text-4xl">Moderar</h1>
      <label htmlFor="token" className="mt-8 block font-mono text-[0.7rem] tracking-[0.16em] text-nevoa/50 uppercase">Token de administrador</label>
      <input id="token" type="password" value={token} onChange={(e) => setToken(e.target.value)} autoComplete="off" className="mt-1.5 w-full rounded-xl border border-white/15 bg-transparent px-3.5 py-2.5 outline-none focus:border-nevoa/60" />
      <p role="status" className="mt-2 min-h-[1.4rem] text-[#fb7185]">{erro}</p>
      <ul className="mt-4 space-y-3">
        {lista.map((c) => (
          <li key={c.id} className="flex items-start justify-between gap-4 rounded-xl border border-white/10 p-4">
            <div className="min-w-0">
              <p><span className="font-medium">{c.nome}</span> <span className="font-mono text-[0.72rem] text-nevoa/40" suppressHydrationWarning>{ha(c.criado)}</span></p>
              <p className="mt-1 break-words whitespace-pre-wrap text-nevoa/80">{c.texto}</p>
            </div>
            <button onClick={() => apagar(c.id)} className="shrink-0 rounded-lg border border-[#fb7185]/50 px-3 py-1.5 text-[0.85rem] text-[#fb7185] transition-colors hover:bg-[#fb7185]/10">Apagar</button>
          </li>
        ))}
        {lista.length === 0 && <li className="text-nevoa/50">Sem comentários.</li>}
      </ul>
    </div>
  );
}
