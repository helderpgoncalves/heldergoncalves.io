'use client';

import { useCallback, useEffect, useState } from 'react';
import { AVATAR_PADRAO } from '@/lib/microsoft/chat';

// Quem és neste chat: nickname, avatar e cor (escolhidos uma só vez), mais um identificador anónimo (para as
// reacções contarem uma vez por pessoa) e os segredos das tuas mensagens (para as poderes apagar).
// Tudo fica só neste browser.

const NOME_VALIDO = /^[\p{L}\p{N} ._'-]{2,24}$/u;

const ler = <T,>(chave: string, vazio: T): T => {
  try { const v = localStorage.getItem(chave); return v ? (JSON.parse(v) as T) : vazio; } catch { return vazio; }
};
const guardar = (chave: string, valor: unknown) => { try { localStorage.setItem(chave, JSON.stringify(valor)); } catch { /* sem armazenamento: não faz mal */ } };

export function useIdentidade() {
  const [carregado, setCarregado] = useState(false);
  const [nome, setNome] = useState('');
  const [avatar, setAvatar] = useState<string>(AVATAR_PADRAO);
  const [cor, setCor] = useState(0);
  const [cliente, setCliente] = useState('');
  const [segredos, setSegredos] = useState<Record<string, string>>({});
  const [minhas, setMinhas] = useState<Record<string, string[]>>({});

  useEffect(() => {
    setNome(ler('msft-nick', ''));
    setAvatar(ler('msft-avatar', AVATAR_PADRAO));
    setCor(ler('msft-cor', 0));
    setSegredos(ler('msft-segredos', {}));
    setMinhas(ler('msft-reacoes', {}));
    let id = ler('msft-cliente', '');
    if (!id) { id = crypto.randomUUID(); guardar('msft-cliente', id); }
    setCliente(id);
    setCarregado(true);
  }, []);

  /** Guarda o perfil de vez: a partir daqui já podes falar. */
  const definir = useCallback((n: string, a: string, c: number) => {
    const limpo = n.normalize('NFC').replace(/\s+/g, ' ').trim();
    setNome(limpo); setAvatar(a); setCor(c);
    guardar('msft-nick', limpo); guardar('msft-avatar', a); guardar('msft-cor', c);
  }, []);

  const guardarSegredo = useCallback((id: string, segredo: string) => {
    setSegredos((s) => { const novo = Object.fromEntries(Object.entries({ ...s, [id]: segredo }).slice(-80)); guardar('msft-segredos', novo); return novo; });
  }, []);
  const esquecerSegredo = useCallback((id: string) => {
    setSegredos((s) => { const { [id]: _, ...resto } = s; guardar('msft-segredos', resto); return resto; });
  }, []);

  const marcarReacao = useCallback((id: string, emoji: string, ligar: boolean) => {
    setMinhas((m) => {
      const atuais = new Set(m[id] ?? []);
      if (ligar) atuais.add(emoji); else atuais.delete(emoji);
      const novo = Object.fromEntries(Object.entries({ ...m, [id]: [...atuais] }).slice(-200));
      guardar('msft-reacoes', novo);
      return novo;
    });
  }, []);

  return { carregado, pronto: NOME_VALIDO.test(nome), nome, avatar, cor, cliente, segredos, minhas, definir, guardarSegredo, esquecerSegredo, marcarReacao };
}
