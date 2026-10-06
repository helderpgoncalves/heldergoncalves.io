import { createHash, randomBytes, randomUUID, timingSafeEqual } from 'node:crypto';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { AVATARES, AVATAR_PADRAO, CORES, REACOES } from './chat';
import type { Comentario } from './tipos';

// Sem base de dados: um ficheiro JSON por linha, só de acrescentar, num volume do servidor (DATA_DIR).
// Cada linha é uma coisa que aconteceu: um comentário, um apagar, ou uma reacção ligada/desligada.
// Ao arrancar, lê-se tudo e reconstrói-se o estado.

const DIR = process.env.DATA_DIR ?? path.join(process.cwd(), 'data');
const FICHEIRO = path.join(DIR, 'comentarios.jsonl');
const MAX_EM_MEMORIA = 1000;

/** O comentário guardado: o público mais o hash do segredo de quem o escreveu e quem reagiu a quê. */
type Interno = Omit<Comentario, 'reacoes'> & { h: string; reacoes: Map<string, Set<string>> };
type Linha =
  | (Omit<Comentario, 'reacoes'> & { h: string })
  | { remover: string }
  | { reagir: { id: string; e: string; c: string; ligar: boolean } };

// O estado vive em globalThis: cada rota pode ter a sua cópia deste módulo (no desenvolvimento, sobretudo),
// e todas têm de ver as mesmas mensagens.
const g = globalThis as { __chat?: { todos?: Promise<Map<string, Interno>>; escritas: Promise<unknown> } };
const estado = (g.__chat ??= { escritas: Promise.resolve() }); // escritas: uma de cada vez

const sha = (s: string) => createHash('sha256').update(s).digest('hex');
const texto = (o: Record<string, unknown>, k: string) => typeof o[k] === 'string';

function publico(i: Interno): Comentario {
  const reacoes: Record<string, number> = {};
  for (const [e, quem] of i.reacoes) if (quem.size) reacoes[e] = quem.size;
  return { id: i.id, nome: i.nome, texto: i.texto, criado: i.criado, avatar: i.avatar, cor: i.cor, reacoes };
}

async function ler(): Promise<Map<string, Interno>> {
  const todos = new Map<string, Interno>();
  let conteudo = '';
  try {
    conteudo = await fs.readFile(FICHEIRO, 'utf8');
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === 'ENOENT') return todos;
    throw e;
  }
  for (const linha of conteudo.split('\n')) {
    if (!linha) continue;
    try {
      const o = JSON.parse(linha) as Record<string, unknown>;
      if (typeof o.remover === 'string') todos.delete(o.remover);
      else if (o.reagir && typeof o.reagir === 'object') {
        const r = o.reagir as { id: string; e: string; c: string; ligar: boolean };
        const quem = todos.get(r.id)?.reacoes;
        if (quem) { const set = quem.get(r.e) ?? new Set<string>(); r.ligar ? set.add(r.c) : set.delete(r.c); quem.set(r.e, set); }
      } else if (texto(o, 'id') && texto(o, 'nome') && texto(o, 'texto') && texto(o, 'criado')) {
        // Mensagens de antes dos avatares: ganham o avatar de origem.
        todos.set(o.id as string, {
          id: o.id as string, nome: o.nome as string, texto: o.texto as string, criado: o.criado as string,
          avatar: AVATARES.includes(o.avatar as never) ? (o.avatar as string) : AVATAR_PADRAO,
          cor: Number.isInteger(o.cor) && (o.cor as number) >= 0 && (o.cor as number) < CORES.length ? (o.cor as number) : 0,
          h: typeof o.h === 'string' ? o.h : '', reacoes: new Map(),
        });
      }
    } catch { /* uma linha estragada não deita abaixo as outras */ }
  }
  while (todos.size > MAX_EM_MEMORIA) todos.delete(todos.keys().next().value as string);
  return todos;
}

const lista = () => (estado.todos ??= ler().catch((e) => { estado.todos = undefined; throw e; }));

function acrescentar(linha: Linha): Promise<unknown> {
  estado.escritas = estado.escritas.catch(() => {}).then(async () => {
    await fs.mkdir(DIR, { recursive: true });
    await fs.appendFile(FICHEIRO, JSON.stringify(linha) + '\n');
  });
  return estado.escritas;
}

/** As últimas `n` mensagens, da mais antiga para a mais recente (como num chat). */
export async function recentes(n = 80): Promise<Comentario[]> {
  return [...(await lista()).values()].slice(-n).map(publico);
}

/** Devolve o comentário e o segredo de quem o escreveu (só existe agora; no disco fica o hash). */
export async function adicionar(nome: string, textoLivre: string, avatar: string, cor: number): Promise<{ comentario: Comentario; segredo: string }> {
  const todos = await lista();
  const segredo = randomBytes(16).toString('hex');
  const i: Interno = { id: randomUUID(), nome, texto: textoLivre, criado: new Date().toISOString(), avatar, cor, h: sha(segredo), reacoes: new Map() };
  const { reacoes: _ignorar, ...linha } = i;
  await acrescentar(linha); // só entra na memória depois de ficar no disco
  todos.set(i.id, i);
  if (todos.size > MAX_EM_MEMORIA) todos.delete(todos.keys().next().value as string);
  return { comentario: publico(i), segredo };
}

export async function remover(id: string): Promise<boolean> {
  const todos = await lista();
  if (!todos.has(id)) return false;
  await acrescentar({ remover: id });
  todos.delete(id);
  return true;
}

/** Quem escreveu a mensagem prova-o com o segredo que recebeu ao escrevê-la. */
export async function eAutor(id: string, segredo: string): Promise<boolean> {
  const i = (await lista()).get(id);
  if (!i?.h || !segredo) return false;
  return timingSafeEqual(Buffer.from(sha(segredo)), Buffer.from(i.h));
}

/** Liga ou desliga uma reacção de um cliente. Devolve as reacções da mensagem, ou null se não existir. */
export async function reagir(id: string, emoji: string, cliente: string, ligar: boolean): Promise<Record<string, number> | null> {
  const i = (await lista()).get(id);
  if (!i || !(REACOES as readonly string[]).includes(emoji)) return null;
  const quem = i.reacoes.get(emoji) ?? new Set<string>();
  if (quem.has(cliente) === ligar) return publico(i).reacoes; // já estava assim
  await acrescentar({ reagir: { id, e: emoji, c: cliente, ligar } });
  if (ligar) quem.add(cliente); else quem.delete(cliente);
  i.reacoes.set(emoji, quem);
  return publico(i).reacoes;
}

/* ---------- Validação ---------- */

type Erro = 'nome' | 'texto' | 'ligacoes' | 'reservado';
const RESERVADOS = /^(h[eé]lder|admin|moderador|mod|root|sistema)\b/i;

export function validar(nomeBruto: unknown, textoBruto: unknown, avatarBruto: unknown, corBruta: unknown):
  { nome: string; texto: string; avatar: string; cor: number } | { erro: Erro } {
  const nome = typeof nomeBruto === 'string' ? nomeBruto.normalize('NFC').replace(/\s+/g, ' ').trim() : '';
  if (nome.length < 2 || nome.length > 24 || !/^[\p{L}\p{N} ._'-]+$/u.test(nome)) return { erro: 'nome' };
  if (RESERVADOS.test(nome)) return { erro: 'reservado' };

  const texto = typeof textoBruto === 'string'
    ? textoBruto.normalize('NFC').replace(/\r\n?/g, '\n').replace(/[^\S\n]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim()
    : '';
  if (texto.length < 1 || [...texto].length > 280 || /[\u0000-\u0008\u000B\u000C\u000E-\u001F]/.test(texto)) return { erro: 'texto' };
  if (/https?:\/\/|www\.|\b[a-z0-9-]+\.(com|net|org|io|si|pt|ru|cn|xyz|top|link)\b/i.test(texto)) return { erro: 'ligacoes' };

  // Avatar e cor: só o que está na lista; qualquer outra coisa volta ao padrão, nunca é guardada.
  const avatar = AVATARES.find((a) => a === avatarBruto) ?? AVATAR_PADRAO;
  const cor = Number.isInteger(corBruta) && (corBruta as number) >= 0 && (corBruta as number) < CORES.length ? (corBruta as number) : 0;
  return { nome, texto, avatar, cor };
}

/** O mesmo nome e texto, há pouco: repetição (ou duplo clique). */
export async function repetido(nome: string, textoLivre: string): Promise<boolean> {
  const limite = Date.now() - 5 * 60_000;
  return [...(await lista()).values()].some((c) => c.nome === nome && c.texto === textoLivre && Date.parse(c.criado) > limite);
}
