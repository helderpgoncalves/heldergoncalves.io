// ─────────────────────────────────────────────────────────────────────
// O modelo de movimento do telefone.
//
// Abrir, fechar e arrastar usam TODOS a mesma fórmula, com o mesmo
// ponto de origem. Era isto que faltava: se o arrasto encolher a app
// pelo centro e a largada continuar a partir do canto, vê-se o salto.
//
// `p` vai de 0 (app inteira, a ocupar o ecrã) a 1 (dentro do ícone), e
// toda a gente concorda no caminho.
// ─────────────────────────────────────────────────────────────────────

export const EASE = 'cubic-bezier(.32,.72,0,1)';

// Browsers antigos (Safari 12 e afins) não têm Web Animations. Em vez de
// partir, ficam sem a animação — o site funciona na mesma.
export const CAN_ANIMATE = typeof Element !== 'undefined' && typeof Element.prototype.animate === 'function';

/** O quadro em `p`: quanto encolheu, e para onde foi. */
export const frame = (t, p, drift) =>
  'translate3d(' + (t.x * p + (drift || 0)) + 'px,' + t.y * p + 'px,0) scale(' + (1 - (1 - t.s) * p) + ')';

/** Os cantos fecham-se à medida que a app encolhe para o ícone. */
export const radiusAt = (p) => 28 * p + 'px';

export function createMotion(ph) {
  const { phone, sb } = ph.els;

  /** Onde está o elemento, relativamente ao centro do telefone. */
  function targetFrom(el) {
    const pr = phone.getBoundingClientRect();
    if (!el || !pr.width) return null;
    const r = el.getBoundingClientRect();
    if (!r.width) return null;
    return {
      s: Math.max(0.06, r.width / pr.width),
      x: r.left + r.width / 2 - (pr.left + pr.width / 2),
      y: r.top + r.height / 2 - (pr.top + pr.height / 2),
    };
  }

  /** O alvo é o ícone da aplicação no ecrã inicial. */
  const iconTarget = (id) => targetFrom(ph.iconFor(id));

  /** O mesmo, mas a partir de um elemento qualquer — um cartão, digamos. */
  const rectTarget = (el) => targetFrom(el);

  /** O ecrã inicial acompanha: aparece à medida que a app se afasta. */
  function springboardAt(p) {
    if (p <= 0) {
      sb.style.transform = '';
      sb.style.opacity = '';
      sb.style.filter = '';
      sb.classList.add('pushed');
      return;
    }
    sb.classList.remove('pushed');
    sb.style.transform = 'scale(' + (0.93 + 0.07 * p) + ')';
    sb.style.opacity = String(Math.min(1, p * 1.4));
    sb.style.filter = 'blur(' + (1 - p) * 6 + 'px)';
  }

  /** Põe o ecrã inicial atrás (ou à frente) sem transição nenhuma. */
  function pushSpringboard(on) {
    sb.style.transform = '';
    sb.style.opacity = '';
    sb.style.filter = '';
    sb.classList.toggle('pushed', on);
  }

  return { iconTarget, rectTarget, springboardAt, pushSpringboard };
}
