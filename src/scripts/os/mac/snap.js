// ─────────────────────────────────────────────────────────────────────
// Encaixar janelas nas margens.
//
// Arrastar uma janela até ao topo enche o ecrã; até a um dos lados,
// enche metade. Enquanto se arrasta, mostra-se onde ela vai ficar — que
// é o que faz a diferença entre um gesto que se percebe e um gesto que
// se adivinha.
// ─────────────────────────────────────────────────────────────────────

/** A que distância da margem o encaixe se arma, em píxeis. */
export const SNAP_EDGE = 4;

export function createSnap(desk) {
  let preview = null;

  function rectFor(zone) {
    const { w: W, h: H } = desk.area();
    if (zone === 'top') return { x: 0, y: 0, w: W, h: H };
    if (zone === 'left') return { x: 0, y: 0, w: Math.round(W / 2), h: H };
    if (zone === 'right') return { x: Math.round(W / 2), y: 0, w: Math.round(W / 2), h: H };
    return null;
  }

  /** Mostra (ou apaga, com `null`) o rectângulo de destino. */
  function show(zone) {
    const r = rectFor(zone);
    if (!r) {
      if (preview) preview.remove();
      preview = null;
      return;
    }
    if (!preview) {
      preview = document.createElement('div');
      preview.className = 'snap-preview';
      desk.els.layer.appendChild(preview);
    }
    preview.style.cssText = 'left:' + r.x + 'px;top:' + r.y + 'px;width:' + r.w + 'px;height:' + r.h + 'px';
  }

  function to(win, zone) {
    const r = rectFor(zone);
    if (!r) return;
    win.classList.remove('zoomed');
    win.classList.add('snapping');
    win.style.setProperty('--x', r.x + 'px');
    win.style.setProperty('--y', r.y + 'px');
    win.style.setProperty('--w', r.w + 'px');
    win.style.setProperty('--h', r.h + 'px');
    setTimeout(() => win.classList.remove('snapping'), 220);
  }

  /** Em que zona de encaixe está este ponto, se estiver em alguma. */
  function zoneAt(px, py, W) {
    if (py <= SNAP_EDGE) return 'top';
    if (px <= SNAP_EDGE) return 'left';
    if (px >= W - SNAP_EDGE) return 'right';
    return null;
  }

  return { show, to, zoneAt };
}
