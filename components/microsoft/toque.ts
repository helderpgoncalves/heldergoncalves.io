/** Uma vibração curtinha no telemóvel (onde o browser a permite), para o toque "pegar". Não faz nada no resto. */
export const toque = (ms = 8) => { try { navigator.vibrate?.(ms); } catch { /* sem vibração: não faz mal */ } };
