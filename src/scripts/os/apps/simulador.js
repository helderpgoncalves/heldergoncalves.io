export function initSimulator(ctx) {
  const el = ctx.contentNode('simulador');
  if (!el) return;
  const frame = el.querySelector('[data-sim-frame]');
  const depth = parseInt(new URLSearchParams(location.search).get('d') || '0', 10);

  ctx.loadSimulator = () => {
    if (depth >= 2) {
      el.querySelector('[data-sim]').innerHTML =
        '<div class="sim-deep"><svg viewBox="0 0 100 100" width="40" height="40" aria-hidden="true">' +
        '<use href="#icon-simulador"/></svg><p>∞</p></div>';
      return;
    }
    if (frame && !frame.src) {
      frame.src = ctx.data.routes[ctx.data.lang].home + '?device=1&d=' + (depth + 1);
    }
  };
}
