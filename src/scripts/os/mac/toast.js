// A notificação do Mac, canto superior direito — como o Centro de
// Notificações a sério. Ao contrário da ilha do telefone (uma linha,
// sempre a mesma), aqui cabem várias ao mesmo tempo, empilhadas.
const SHOW_FOR = 4000;

export function createToast(desk) {
  const stack = document.getElementById('toasts');
  if (!stack) return { notify: () => {} };

  // Sem ícone próprio (a maioria dos avisos, hoje) usa o do sistema —
  // o mesmo `ui-apple` da barra de menus, como faria o Finder.
  function notify(title, body, iconSrc) {
    const el = document.createElement('div');
    el.className = 'toast glass glass-dark';
    el.innerHTML =
      '<span class="toast-icon"></span>' +
      '<span><p class="toast-title"></p><p class="toast-body"></p></span>';
    el.querySelector('.toast-title').textContent = title;
    el.querySelector('.toast-body').textContent = body || '';
    const icon = el.querySelector('.toast-icon');
    if (iconSrc) {
      const img = document.createElement('img');
      img.src = iconSrc;
      img.alt = '';
      icon.appendChild(img);
    } else {
      icon.innerHTML = '<svg viewBox="0 0 100 100" width="16" height="16" aria-hidden="true"><use href="#ui-apple"></use></svg>';
    }
    stack.appendChild(el);

    const remove = () => {
      el.classList.add('leaving');
      el.addEventListener('animationend', () => el.remove(), { once: true });
      setTimeout(() => el.remove(), 400);
    };
    const timer = setTimeout(remove, SHOW_FOR);
    el.addEventListener('click', () => {
      clearTimeout(timer);
      remove();
    });
  }

  return { notify };
}
