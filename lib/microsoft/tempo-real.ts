import { buscarCotacao, type Cotacao } from './cotacao';
import { publicar } from './posicao';
import type { Comentario, Estado, Evento } from './tipos';
import { recentes } from './comentarios';

// Um único pedido ao Yahoo serve todos os visitantes: o hub vai buscar a cotação enquanto houver
// alguém a ver, e empurra o que mudou para cada ligação aberta (Server-Sent Events).
// Sem ninguém a ver, não faz pedido nenhum.

const A_CADA_ABERTO = 4_000;
const A_CADA_FECHADO = 60_000;
const MAX_LIGACOES = 300;

type Ouvinte = (e: Evento) => void;

class Hub {
  private ouvintes = new Set<Ouvinte>();
  private temporizador?: ReturnType<typeof setTimeout>;
  private cache: Cotacao | null = null;
  private quando = 0;
  private pendente?: Promise<Cotacao | null>;

  get ligacoes() { return this.ouvintes.size; }
  get cheio() { return this.ouvintes.size >= MAX_LIGACOES; }

  /** A cotação mais recente, no máximo com `idade` ms; vários pedidos em simultâneo partilham o mesmo. */
  async atual(idade = 5_000): Promise<Cotacao | null> {
    if (this.cache && Date.now() - this.quando < idade) return this.cache;
    return this.atualizar();
  }

  private atualizar(): Promise<Cotacao | null> {
    this.pendente ??= buscarCotacao()
      .then((c) => { this.cache = c; this.quando = Date.now(); return c; })
      .catch((e) => { console.error(`[microsoft] cotação falhou: ${e instanceof Error ? e.message : e}`); return this.cache; })
      .finally(() => { this.pendente = undefined; });
    return this.pendente;
  }

  async estado(): Promise<Estado> {
    const c = await this.atual();
    return { cotacao: c ? { ...publicar(c), serie: c.serie } : null, comentarios: await recentes(), online: this.ligacoes };
  }

  emitir(e: Evento) { for (const o of this.ouvintes) o(e); }

  /** Regista uma ligação; devolve a função que a termina. */
  subscrever(o: Ouvinte): () => void {
    this.ouvintes.add(o);
    if (this.ouvintes.size === 1) void this.ciclo();
    this.avisarOnline();
    return () => {
      this.ouvintes.delete(o);
      if (this.ouvintes.size === 0) { clearTimeout(this.temporizador); this.temporizador = undefined; }
      this.avisarOnline();
    };
  }

  // Quem está a ver, com um pequeno atraso para uma rajada de entradas e saídas valer um só aviso.
  private avisando?: ReturnType<typeof setTimeout>;
  private avisarOnline() {
    clearTimeout(this.avisando);
    this.avisando = setTimeout(() => this.emitir({ tipo: 'online', dados: { n: this.ouvintes.size } }), 400);
    this.avisando.unref?.();
  }

  private async ciclo() {
    const antes = this.cache;
    const c = await this.atualizar();
    if (c && (c.preco !== antes?.preco || c.hora !== antes?.hora)) {
      this.emitir({ tipo: 'cotacao', dados: { ...publicar(c), ponto: [c.hora, c.preco] } });
    }
    if (this.ouvintes.size === 0) return;
    const aberto = c ? publicar(c).aberto : false;
    this.temporizador = setTimeout(() => void this.ciclo(), aberto ? A_CADA_ABERTO : A_CADA_FECHADO);
    this.temporizador.unref?.();
  }
}

// Um só hub por processo, mesmo com o recarregamento a quente do desenvolvimento.
const g = globalThis as { __hubMicrosoft?: Hub };
export const hub = (g.__hubMicrosoft ??= new Hub());

export const novoComentario = (c: Comentario) => hub.emitir({ tipo: 'comentario', dados: c });
export const novaReacao = (id: string, reacoes: Record<string, number>) => hub.emitir({ tipo: 'reacao', dados: { id, reacoes } });
