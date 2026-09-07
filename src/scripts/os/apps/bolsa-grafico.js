// ─────────────────────────────────────────────────────────────────────
// Os gráficos da Bolsa, em SVG feito à mão: a linha pequena da lista e
// a grande do título escolhido. Nada de bibliotecas — é uma polilinha,
// um preenchimento por baixo, a linha do fecho anterior a tracejado, e
// um cursor que segue o dedo ou o rato e diz o preço naquele instante.
// É tudo o que a Bolsa da Apple mostra também.
//
// No dia, o eixo do tempo é a sessão inteira, não só o que já passou:
// com o mercado aberto a linha pára a meio do gráfico e o resto fica
// vazio, como no original.
// ─────────────────────────────────────────────────────────────────────

const COLOR = { up: 'var(--green)', down: 'var(--red)', flat: 'var(--gray)' };

const W = 600;
const H = 220;
const PAD = 14;

/** As posições dos pontos numa caixa, com o domínio do tempo dado. */
function fit(points, domain) {
  const ys = points.map((p) => p[1]);
  const min = Math.min(...ys);
  const max = Math.max(...ys);
  const span = max - min || 1;
  const [t0, t1] = domain;
  const dt = t1 - t0 || 1;
  return {
    min,
    max,
    pts: points.map((p) => [((p[0] - t0) / dt) * W, PAD + (1 - (p[1] - min) / span) * (H - PAD * 2)]),
  };
}

const path = (pts) => pts.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' ');

export function sparkline(points, tone) {
  if (!points || points.length < 2) return '';
  const w = 84;
  const h = 30;
  const ys = points.map((p) => p[1]);
  const min = Math.min(...ys);
  const max = Math.max(...ys);
  const span = max - min || 1;
  const n = points.length;
  const pts = points.map((p, i) => [(i / (n - 1)) * w, 2 + (1 - (p[1] - min) / span) * (h - 4)]);
  return (
    '<svg viewBox="0 0 ' + w + ' ' + h + '" width="' + w + '" height="' + h + '" aria-hidden="true">' +
    '<path d="' + path(pts) + '" fill="none" stroke="' + COLOR[tone] + '" stroke-width="1.5" stroke-linejoin="round" stroke-linecap="round"/>' +
    '</svg>'
  );
}

/** As marcas do eixo do tempo: horas no dia, dias ou meses nos outros. */
function ticks(domain, range, locale) {
  const [t0, t1] = domain;
  const n = 4;
  const out = [];
  const fmt =
    range === '1d'
      ? new Intl.DateTimeFormat(locale, { hour: '2-digit', minute: '2-digit' })
      : range === '1w' || range === '1m'
        ? new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short' })
        : range === '2y' || range === '5y' || range === 'all'
          ? new Intl.DateTimeFormat(locale, { year: 'numeric' })
          : new Intl.DateTimeFormat(locale, { month: 'short' });
  for (let i = 0; i <= n; i++) {
    const t = t0 + ((t1 - t0) * i) / n;
    out.push({ pct: (100 * i) / n, label: fmt.format(new Date(t * 1000)) });
  }
  return out;
}

/**
 * O eixo do tempo em HTML, fora do SVG: o gráfico é esticado sem
 * manter a proporção (`preserveAspectRatio="none"`, para caber
 * exactamente na caixa), e texto dentro dele esticaria com a curva,
 * as letras mais largas ou mais estreitas conforme a janela. Fora do
 * SVG o texto é só texto, no tamanho do sistema.
 */
function axisHtml(domain, range, locale) {
  const marks = ticks(domain, range, locale);
  return (
    '<div class="stk-axis">' +
    marks
      .map((m, i, all) => {
        const edge = i === 0 ? 'start' : i === all.length - 1 ? 'end' : 'mid';
        return '<span class="stk-axis-' + edge + '" style="left:' + m.pct.toFixed(2) + '%">' + m.label + '</span>';
      })
      .join('') +
    '</div>'
  );
}

/**
 * O gráfico grande. `opts.session` é [início, fim] da sessão, para o
 * dia; `opts.previous` o fecho anterior, que aparece a tracejado.
 */
export function chart(points, tone, opts = {}) {
  if (!points || points.length < 2) return '<p class="stk-nodata">—</p>';
  const domain = opts.session && opts.session[1] > opts.session[0] ? opts.session : [points[0][0], points[points.length - 1][0]];
  const { min, max, pts } = fit(points, domain);
  let ref = '';
  const previous = opts.previous;
  if (typeof previous === 'number' && previous >= min && previous <= max) {
    const y = PAD + (1 - (previous - min) / (max - min || 1)) * (H - PAD * 2);
    ref = '<line x1="0" x2="' + W + '" y1="' + y.toFixed(1) + '" y2="' + y.toFixed(1) + '" stroke="var(--line-strong)" stroke-dasharray="3 4"/>';
  }
  const id = 'stk-fill-' + tone;
  return (
    '<svg class="stk-svg" viewBox="0 0 ' + W + ' ' + H + '" preserveAspectRatio="none" aria-hidden="true">' +
    '<defs><linearGradient id="' + id + '" x1="0" y1="0" x2="0" y2="1">' +
    '<stop offset="0" stop-color="' + COLOR[tone] + '" stop-opacity=".26"/><stop offset="1" stop-color="' + COLOR[tone] + '" stop-opacity="0"/>' +
    '</linearGradient></defs>' +
    ref +
    '<path d="' + path(pts) + ' L' + pts[pts.length - 1][0].toFixed(1) + ' ' + H + ' L' + pts[0][0].toFixed(1) + ' ' + H + ' Z" fill="url(#' + id + ')"/>' +
    '<path class="stk-line" d="' + path(pts) + '" fill="none" stroke="' + COLOR[tone] + '" stroke-width="2" stroke-linejoin="round" stroke-linecap="round" vector-effect="non-scaling-stroke"/>' +
    '<g class="stk-cursor" hidden><line y1="0" y2="' + H + '" stroke="var(--ink-3)"/><circle r="4" fill="' + COLOR[tone] + '" stroke="var(--surface-solid)" stroke-width="2"/></g>' +
    '</svg>' +
    axisHtml(domain, opts.range || '1d', opts.locale) +
    '<div class="stk-cursor-label" hidden></div>'
  );
}

/**
 * Liga o cursor ao gráfico. `onPoint(point | null)` recebe o ponto por
 * baixo do dedo, e nada quando o dedo sai — é quem chama que decide o
 * que fazer com ele (a Apple mostra o preço desse instante no título).
 */
export function wireChart(host, points, opts, onPoint) {
  const svg = host.querySelector('.stk-svg');
  const cursor = host.querySelector('.stk-cursor');
  const label = host.querySelector('.stk-cursor-label');
  if (!svg || !cursor || !points || points.length < 2) return;
  const domain = opts.session && opts.session[1] > opts.session[0] ? opts.session : [points[0][0], points[points.length - 1][0]];
  const { pts } = fit(points, domain);
  const fmt = new Intl.DateTimeFormat(
    opts.locale,
    opts.range === '1d' || opts.range === '1w' ? { hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'short' } : { day: 'numeric', month: 'short', year: 'numeric' }
  );

  const at = (clientX) => {
    const r = svg.getBoundingClientRect();
    const x = ((clientX - r.left) / (r.width || 1)) * W;
    // O ponto mais perto do dedo, ao longo do tempo.
    let best = 0;
    for (let i = 1; i < pts.length; i++) if (Math.abs(pts[i][0] - x) < Math.abs(pts[best][0] - x)) best = i;
    return best;
  };

  const show = (i) => {
    const [x, y] = pts[i];
    cursor.hidden = false;
    cursor.querySelector('line').setAttribute('x1', x.toFixed(1));
    cursor.querySelector('line').setAttribute('x2', x.toFixed(1));
    cursor.querySelector('circle').setAttribute('cx', x.toFixed(1));
    cursor.querySelector('circle').setAttribute('cy', y.toFixed(1));
    label.hidden = false;
    label.textContent = fmt.format(new Date(points[i][0] * 1000));
    label.style.left = ((x / W) * 100).toFixed(2) + '%';
    onPoint(points[i]);
  };
  const hide = () => {
    cursor.hidden = true;
    label.hidden = true;
    onPoint(null);
  };

  host.addEventListener('pointermove', (ev) => show(at(ev.clientX)));
  host.addEventListener('pointerdown', (ev) => show(at(ev.clientX)));
  host.addEventListener('pointerleave', hide);
  host.addEventListener('pointerup', hide);
  host.addEventListener('pointercancel', hide);
}
