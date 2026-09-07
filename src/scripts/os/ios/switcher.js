// O comutador de aplicações: os cartões que se arrastam para fora.
// Empurrar um para cima fecha a app; empurrá-lo para baixo faz
// elástico, para não parecer partido.
import { track, rubber, clamp, project } from '../gesture.js';
import { esc } from '../lib/dom.js';
import { EASE } from './motion.js';

/** Quanto é preciso empurrar para cima para o cartão sair, em píxeis. */
const FLICK_OUT = 110;

export function createSwitcher(ph) {
  const { els, stack } = ph;
  const { switcher } = els;

  const close = () => switcher.classList.remove('open');

  function card(id) {
    const app = ph.meta(id);
    return (
      '<article class="switcher-card" data-card="' +
      esc(id) +
      '"><header class="card-head"><svg viewBox="0 0 100 100" aria-hidden="true"><use href="#icon-' +
      esc(id) +
      '"/></svg><strong>' +
      esc(app.name) +
      '</strong></header><div class="card-body">' +
      esc(app.subtitle) +
      '</div></article>'
    );
  }

  function wireCard(el) {
    track(
      el,
      {
        begin: () => {
          el.style.transition = 'none';
          el.style.willChange = 'transform, opacity';
        },
        move: (g) => {
          const up = Math.min(0, g.dy);
          const down = g.dy > 0 ? rubber(g.dy, 90) : 0;
          el.style.transform = 'translate3d(0,' + (up + down) + 'px,0) scale(' + (1 - Math.min(0.06, -up / 2400)) + ')';
          el.style.opacity = String(clamp(1 + up / 520, 0.25, 1));
        },
        end: (g) => {
          el.style.willChange = '';
          if (-g.dy + project(-g.vy) > FLICK_OUT) {
            const id = el.dataset.card;
            el.style.transition = 'transform .24s ' + EASE + ', opacity .2s linear';
            el.style.transform = 'translate3d(0,-130%,0) scale(.9)';
            el.style.opacity = '0';
            setTimeout(() => {
              ph.views.close(id);
              el.remove();
              if (!stack.length) close();
            }, 230);
            return;
          }
          el.style.transition = 'transform .26s ' + EASE + ', opacity .2s linear';
          el.style.transform = '';
          el.style.opacity = '';
          setTimeout(() => (el.style.transition = ''), 280);
        },
      },
      { axis: 'y', threshold: 10 }
    );
  }

  function open() {
    if (!stack.length) return;
    const rail = switcher.querySelector('.switcher-rail');
    // A mais recente primeiro, como no iOS.
    rail.innerHTML = stack.slice().reverse().map(card).join('');
    switcher.classList.add('open');
    rail.querySelectorAll('.switcher-card').forEach(wireCard);
  }

  switcher.addEventListener('click', (ev) => {
    const el = ev.target.closest('[data-card]');
    if (el) {
      close();
      ph.views.open(el.dataset.card, el);
    } else if (ev.target === switcher) {
      close();
    }
  });

  return { open, close };
}
