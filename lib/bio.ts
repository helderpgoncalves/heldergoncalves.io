import { PROJETOS, SITE } from './site';

// As ligações da página de bio (bio.heldergoncalves.io), pela ordem em que aparecem.
// Para acrescentar uma ligação: uma linha aqui. `destaque` pinta o botão com a cor do pôr do sol.
export type LigacaoBio = { rotulo: string; nota?: string; url: string; destaque?: boolean };

export const LIGACOES_BIO: readonly LigacaoBio[] = [
  { rotulo: 'O blog', nota: 'Ideias, dinheiro, vida e software', url: `${SITE.canonico}/blog`, destaque: true },
  { rotulo: 'O site', nota: 'heldergoncalves.io', url: SITE.canonico },
  ...PROJETOS.map((p) => ({ rotulo: p.nome, nota: p.descricao.pt, url: p.url })),
  { rotulo: 'Falar comigo', nota: SITE.email, url: `mailto:${SITE.email}` },
  // NOVAS-LIGAÇÕES (acrescentar acima desta linha)
];
