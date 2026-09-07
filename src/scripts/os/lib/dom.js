// Utilitários de DOM que mais do que uma aplicação precisa.
// Se uma coisa só serve a uma aplicação, vive no ficheiro dela.

const ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

/**
 * Escapa texto para poder entrar em HTML.
 * Só se usa quando é mesmo preciso construir marcação; para pôr texto
 * num nó, `textContent` é sempre melhor e não precisa disto.
 */
export const esc = (value) => String(value).replace(/[&<>"']/g, (ch) => ESCAPES[ch]);
