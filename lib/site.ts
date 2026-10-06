// Um só sítio, dois endereços: heldergoncalves.io é o canónico e helder.si
// redireciona para ele (ver next.config.ts), para o Google não ver duplicados.
export const SITE = {
  url: process.env.SITE_URL ?? 'https://heldergoncalves.io',
  canonico: 'https://heldergoncalves.io',
  alias: 'https://helder.si',
  nome: 'Hélder Gonçalves',
  email: 'work@heldergoncalves.io',
  github: 'https://github.com/helderpgoncalves',
} as const;
