// ─────────────────────────────────────────────────────────────
// Identidade, estrutura do "sistema" e todos os textos das duas
// línguas. Português na raiz, inglês em /en/. Nada de copy solta
// dentro dos componentes: muda-se aqui, muda em todo o lado.
// ─────────────────────────────────────────────────────────────
export const SITE = {
  url: 'https://heldergoncalves.io',
  name: 'Hélder Gonçalves',
  shortName: 'Hélder',
  email: 'helder@heldergoncalves.io',
  ogImage: '/og.png',
  github: 'https://github.com/helderpgoncalves',
  githubHandle: 'helderpgoncalves',
  linkedin: 'https://www.linkedin.com/in/heldergoncalves16/',
  twitter: 'https://x.com/heldinhoshotgun',
  twitterHandle: '@heldinhoshotgun',
  company: { name: 'Bitsapiens', url: 'https://bitsapiens.io/' },
  machine: 'heldergoncalves.io',
};

export type Lang = 'pt' | 'en';
export type AppId =
  | 'sobre'
  | 'escritos'
  | 'mensagens'
  | 'contacto'
  | 'projetos'
  | 'terminal'
  | 'definicoes'
  | 'simulador'
  | 'bolsa'
  | 'calendario';

/**
 * Estrutura de cada aplicação: onde vive, que tamanho tem a janela no
 * Mac e em que ordem aparece na Dock e no ecrã inicial do telefone.
 * Os nomes e descrições estão em COPY[lang].apps — isto é só a mecânica.
 */
export interface AppMeta {
  id: AppId;
  /** Tamanho e mínimo da janela no modo Mac, em píxeis. */
  win: { w: number; h: number; minW: number; minH: number };
  /** Posição inicial da janela (offset em cascata). */
  dock: boolean;
  /** Fica na dock do telefone (as quatro de baixo) em vez da grelha. */
  iosDock: boolean;
  /** Janela sem margens internas (Terminal, Simulador). */
  bare?: boolean;
  /** Abre no arranque do Mac. */
}

export const APPS: AppMeta[] = [
  { id: 'sobre', win: { w: 720, h: 520, minW: 420, minH: 360 }, dock: true, iosDock: false },
  { id: 'escritos', win: { w: 940, h: 620, minW: 560, minH: 380 }, dock: true, iosDock: true },
  { id: 'mensagens', win: { w: 700, h: 560, minW: 420, minH: 380 }, dock: true, iosDock: true },
  { id: 'contacto', win: { w: 660, h: 540, minW: 420, minH: 380 }, dock: true, iosDock: true },
  { id: 'projetos', win: { w: 860, h: 600, minW: 480, minH: 380 }, dock: true, iosDock: false },
  { id: 'terminal', win: { w: 720, h: 460, minW: 380, minH: 240 }, dock: true, iosDock: true, bare: true },
  { id: 'definicoes', win: { w: 760, h: 540, minW: 460, minH: 380 }, dock: true, iosDock: false },
  { id: 'simulador', win: { w: 420, h: 780, minW: 340, minH: 620 }, dock: true, iosDock: false, bare: true },
  { id: 'bolsa', win: { w: 900, h: 600, minW: 520, minH: 400 }, dock: true, iosDock: false, bare: true },
  { id: 'calendario', win: { w: 960, h: 640, minW: 560, minH: 420 }, dock: true, iosDock: false, bare: true },
];

export const appMeta = (id: AppId): AppMeta => APPS.find((a) => a.id === id) as AppMeta;
