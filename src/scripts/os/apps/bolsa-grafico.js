// Os gráficos da Bolsa, em SVG feito à mão: a linha pequena da lista e
// a grande do título escolhido. Nada de bibliotecas — é uma polilinha
// e um preenchimento por baixo, que é tudo o que a aplicação da Apple
// mostra também.

const COLOR = { up: 'var(--green)', down: 'var(--red)', flat: 'var(--gray)' };

/** Converte a série numa lista de pontos dentro de uma caixa w×h. */
function fit(points, w, h, pad) {
  const ys = points.map((p) => p[1]);
  const min = Math.min(...ys);
  const max = Math.max(...ys);
  const span = max - min || 1;
  const n = points.length;
  return points.map((p, i) => [
    (i / Math.max(1, n - 1)) * w,
    pad + (1 - (p[1] - min) / span) * (h - pad * 2),
  ]);
}

const path = (pts) => pts.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' ');

export function sparkline(points, tone) {
  if (!points || points.length < 2) return '';
  const w = 84;
  const h = 30;
  const pts = fit(points, w, h, 2);
  return (
    '<svg viewBox="0 0 ' + w + ' ' + h + '" width="' + w + '" height="' + h + '" aria-hidden="true">' +
    '<path d="' + path(pts) + '" fill="none" stroke="' + COLOR[tone] + '" stroke-width="1.5" stroke-linejoin="round" stroke-linecap="round"/>' +
    '</svg>'
  );
}

/** O gráfico grande, com o fecho anterior a tracejado quando existe. */
export function chart(points, tone, previous) {
  if (!points || points.length < 2) return '<p class="stk-nodata">—</p>';
  const w = 600;
  const h = 220;
  const pts = fit(points, w, h, 12);
  const ys = points.map((p) => p[1]);
  const min = Math.min(...ys);
  const max = Math.max(...ys);
  let ref = '';
  if (typeof previous === 'number' && previous >= min && previous <= max) {
    const y = 12 + (1 - (previous - min) / (max - min || 1)) * (h - 24);
    ref = '<line x1="0" x2="' + w + '" y1="' + y.toFixed(1) + '" y2="' + y.toFixed(1) + '" stroke="var(--line-strong)" stroke-dasharray="3 4"/>';
  }
  const id = 'stk-fill-' + tone;
  return (
    '<svg viewBox="0 0 ' + w + ' ' + h + '" preserveAspectRatio="none" aria-hidden="true">' +
    '<defs><linearGradient id="' + id + '" x1="0" y1="0" x2="0" y2="1">' +
    '<stop offset="0" stop-color="' + COLOR[tone] + '" stop-opacity=".28"/><stop offset="1" stop-color="' + COLOR[tone] + '" stop-opacity="0"/>' +
    '</linearGradient></defs>' +
    ref +
    '<path d="' + path(pts) + ' L' + w + ' ' + h + ' L0 ' + h + ' Z" fill="url(#' + id + ')"/>' +
    '<path d="' + path(pts) + '" fill="none" stroke="' + COLOR[tone] + '" stroke-width="2" stroke-linejoin="round" stroke-linecap="round" vector-effect="non-scaling-stroke"/>' +
    '</svg>'
  );
}
