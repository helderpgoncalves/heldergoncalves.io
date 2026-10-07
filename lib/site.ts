// Um só sítio, dois endereços: heldergoncalves.io é o canónico e helder.si
// redireciona para ele (ver next.config.ts), para o Google não ver duplicados.
export const SITE = {
  url: process.env.SITE_URL ?? 'https://heldergoncalves.io',
  canonico: 'https://heldergoncalves.io',
  alias: 'https://helder.si',
  nome: 'Hélder Gonçalves',
  email: 'work@heldergoncalves.io',
  github: 'https://github.com/helderpgoncalves',
  instagram: 'https://www.instagram.com/helder_goncalves16/',
  instagramNome: 'helder_goncalves16',
  bio: 'https://bio.heldergoncalves.io',
} as const;

// Os projectos que fiz e que assinam este site como autor. Aparecem no rodapé e no JSON-LD (author → #eu).
// Para acrescentar um, basta uma linha aqui.
type Projeto = { nome: string; url: string; descricao: { pt: string; en: string } };
export const PROJETOS: readonly Projeto[] = [
  // Vazio de propósito. Para mostrar um projecto no rodapé, na bio e no llms.txt, acrescenta uma linha:
  // { nome: 'Nome', url: 'https://…', descricao: { pt: '…', en: '…' } },
];
