// Tipos partilhados entre o servidor e o browser (sem nada que só corra no servidor).

/** Um ponto da cotação: [segundos desde 1970, preço]. */
export type Ponto = [number, number];

export type CotacaoPublica = {
  preco: number;
  moeda: string;
  anterior: number;         // fecho do dia anterior
  max: number | null;
  min: number | null;
  hora: number;             // hora do último negócio, em segundos
  aberto: boolean;          // a bolsa está em sessão
  paradoHaMin: number | null; // em sessão mas sem negócios há tanto tempo (minutos)
  performance: number | null; // % face ao custo médio, ou null se a posição não estiver configurada
  faltam: number | null;      // % que o preço ainda tem de subir para a meta (0 = atingida)
  meta: number;               // a meta, em % de lucro
  serie: Ponto[];
};

/** `reacoes`: quantas pessoas deram cada reacção (só as que têm pelo menos uma). */
export type Comentario = { id: string; nome: string; texto: string; criado: string; avatar: string; cor: number; reacoes: Record<string, number> };

export type Estado = { cotacao: CotacaoPublica | null; comentarios: Comentario[]; online: number };

/** O que o servidor envia a cada ligação em tempo real. */
export type Evento =
  | { tipo: 'estado'; dados: Estado }
  | { tipo: 'cotacao'; dados: Omit<CotacaoPublica, 'serie'> & { ponto: Ponto | null } }
  | { tipo: 'comentario'; dados: Comentario }
  | { tipo: 'removido'; dados: { id: string } }
  | { tipo: 'reacao'; dados: { id: string; reacoes: Record<string, number> } }
  | { tipo: 'online'; dados: { n: number } };
