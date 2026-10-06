const lisboa = 'Europe/Lisbon';

export const moeda = (n: number, codigo = 'EUR') =>
  new Intl.NumberFormat('pt-PT', { style: 'currency', currency: codigo, minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);

/** +38,86% / −2,10% (com o sinal de menos a sério). */
export const percentagem = (n: number, casas = 2) => {
  const abs = Math.abs(n).toLocaleString('pt-PT', { minimumFractionDigits: casas, maximumFractionDigits: casas });
  return `${n > 0 ? '+' : n < 0 ? '−' : ''}${abs}%`;
};

export const hora = (segundos: number) =>
  new Intl.DateTimeFormat('pt-PT', { hour: '2-digit', minute: '2-digit', timeZone: lisboa }).format(new Date(segundos * 1000));

export const dataHora = (segundos: number) =>
  new Intl.DateTimeFormat('pt-PT', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: lisboa }).format(new Date(segundos * 1000));

/** "há 5 min", "há 2 h", "agora". */
export function ha(iso: string, agora = Date.now()): string {
  const s = Math.max(0, Math.round((agora - Date.parse(iso)) / 1000));
  if (s < 45) return 'agora';
  if (s < 3600) return `há ${Math.round(s / 60)} min`;
  if (s < 86400) return `há ${Math.round(s / 3600)} h`;
  return `há ${Math.round(s / 86400)} d`;
}

