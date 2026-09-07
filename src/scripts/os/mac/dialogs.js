// Uma caixa de aviso, com a forma de uma janela sem barra de título —
// que é o que o macOS faz quando não há nada a dizer senão "ok".
import { esc } from '../lib/dom.js';

export function createDialogs(desk) {
  function alert(title, body) {
    const el = document.createElement('div');
    el.className = 'win focused dialog';
    el.style.cssText = '--w:340px;--h:auto;left:50%;top:26%;transform:translateX(-50%);z-index:800;height:auto';
    el.innerHTML =
      `<div class="dialog-body"><strong>${esc(title)}</strong><p>${esc(body)}</p>` +
      `<button class="btn btn-primary" type="button">OK</button></div>`;
    desk.els.layer.appendChild(el);
    const kill = () => el.remove();
    el.querySelector('button').addEventListener('click', kill);
    setTimeout(() => el.querySelector('button').focus(), 30);
  }

  return { alert };
}
