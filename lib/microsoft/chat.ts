// O que o chat permite escolher. Fica numa lista fechada: o servidor só aceita o que está aqui,
// por isso um avatar nunca pode ser texto arbitrário.

export const AVATARES = [
  '🦍', '🦧', '🐵', '🙈', '🚀', '🌕', '💎', '🙌',
  '🧻', '🐻', '🐂', '🍌', '🍗', '🤡', '🦄', '🐸',
  '🤖', '👽', '💀', '🔥', '🧠', '👑', '🐋', '🦅',
] as const;

/** As cores de fundo do avatar (matiz HSL). */
export const CORES = [350, 28, 48, 140, 190, 225, 275, 320] as const;

export const REACOES = ['🚀', '💎', '🦍', '🧻'] as const;

export const AVATAR_PADRAO = AVATARES[0];
export const corCss = (i: number) => `hsl(${CORES[i] ?? CORES[0]} 72% 72%)`;
