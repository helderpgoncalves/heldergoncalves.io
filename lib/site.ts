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
export const PROJETOS = [
  { nome: 'Microsoft', url: 'https://microsoft.helder.si', descricao: { pt: 'A Microsoft em tempo real, com chat, até chegar aos 50% de lucro.', en: 'Microsoft in real time, with a live chat, until it hits 50% profit.' } },
] as const;
