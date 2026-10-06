// O espírito do r/wallstreetbets: macacos, mãos de diamante, foguetões. Tudo derivado da performance.

type Fase = { emoji: string; frase: string };

export function fase(performance: number | null): Fase {
  const p = performance ?? 0;
  if (performance === null) return { emoji: '🦍', frase: 'Os macacos ainda estão a contar o dinheiro.' };
  if (p >= 50) return { emoji: '🚀🌕', frase: 'TO THE MOON. Os macacos venceram.' };
  if (p >= 40) return { emoji: '💎🙌', frase: 'Quase lá. Mãos de diamante, não vendas agora.' };
  if (p >= 25) return { emoji: '🦍', frase: 'Apes together strong.' };
  if (p >= 10) return { emoji: '📈', frase: 'Stonks only go up.' };
  if (p >= 0) return { emoji: '🍗', frase: 'Tendies à vista. Hold.' };
  if (p > -25) return { emoji: '🐻', frase: 'O urso espreita. Isto é só uma fase.' };
  if (p > -50) return { emoji: '🧻🤲', frase: 'Mãos de papel detectadas. Respira.' };
  return { emoji: '🧻🔥', frase: 'Mãos de papel nível lendário. Compra mais.' };
}
