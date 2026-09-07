// O ecrã bloqueado, e o gesto que o levanta. Sobe com o dedo e vai-se
// embora se o dedo mostrar que era essa a intenção; senão volta a
// assentar.
import { track, clamp, project } from '../gesture.js';

/** Quanto é preciso subir para o ecrã se levantar, em píxeis. */
const LIFT = 70;

export function createLock(ph) {
  const { ctx, els, s } = ph;
  const { phone, lock } = els;

  function show() {
    lock.hidden = false;
    lock.classList.remove('gone');
    lock.style.transform = '';
  }

  function unlock() {
    if (lock.hidden) return;
    lock.style.transition = '';
    lock.classList.add('gone');
    setTimeout(() => {
      lock.hidden = true;
      lock.style.transform = '';
      ph.island.notify(s.welcome + ', ' + ctx.data.site.name.split(' ')[0]);
    }, 520);
  }

  track(
    lock,
    {
      begin: () => (lock.style.transition = 'none'),
      move: (g) => {
        const h = phone.clientHeight || 1;
        lock.style.transform = 'translate3d(0,' + Math.min(0, g.dy) + 'px,0)';
        lock.style.opacity = String(clamp(1 + g.dy / (h * 0.7), 0.15, 1));
      },
      end: (g) => {
        lock.style.transition = '';
        lock.style.opacity = '';
        if (-g.dy - project(g.vy) > LIFT) unlock();
        else lock.style.transform = '';
      },
      tap: (g, ev) => {
        if (!ev || !ev.target.closest('button')) unlock();
      },
    },
    { axis: 'y', threshold: 8, filter: (ev) => !ev.target.closest('.lock-note, .lock-action') }
  );

  const button = lock.querySelector('[data-unlock]');
  if (button) button.addEventListener('click', unlock);

  return { show, unlock };
}
