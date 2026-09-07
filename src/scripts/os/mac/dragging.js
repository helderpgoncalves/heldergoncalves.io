// ─────────────────────────────────────────────────────────────────────
// Arrastar e redimensionar uma janela.
//
// Está separado do ciclo de vida das janelas porque é outra coisa: ali
// decide-se quando uma janela existe, aqui decide-se para onde ela vai
// enquanto o dedo — ou o rato — a está a levar.
//
// O `api` que cada função recebe é o que a janela precisa de pedir de
// volta ao dono dela: fechar, minimizar, ampliar, focar, e ler ou
// escrever o rectângulo. Passar isto em vez de importar evita que as
// duas metades fiquem presas uma à outra.
// ─────────────────────────────────────────────────────────────────────

export function createDragging(desk) {
  function wire(win, id, api) {
    win.addEventListener('pointerdown', () => api.focus(id), true);

    // Borda de rolagem: a barra de título separa-se do conteúdo assim
    // que há alguma coisa a passar por baixo dela.
    win.addEventListener(
      'scroll',
      (ev) => {
        const top = ev.target && ev.target.scrollTop;
        win.classList.toggle('scrolled', typeof top === 'number' && top > 2);
      },
      true
    );

    win.querySelector('.light-close').addEventListener('click', () => api.close(id));
    win.querySelector('.light-min').addEventListener('click', () => api.minimize(id));
    win.querySelector('.light-zoom').addEventListener('click', () => api.zoom(id));

    wireDrag(win, id, api);
    win.querySelectorAll('.grip').forEach((grip) => wireResize(win, id, grip, api));
  }

  function wireDrag(win, id, api) {
    const bar = win.querySelector('.win-bar');
    bar.addEventListener('dblclick', () => api.zoom(id));
    bar.addEventListener('pointerdown', (ev) => {
      if (ev.target.closest('.light') || ev.button !== 0) return;
      if (win.classList.contains('zoomed')) return;

      const startX = ev.clientX;
      const startY = ev.clientY;
      const o = api.rectOf(win);
      const { w: W, h: H } = desk.area();
      const ww = win.offsetWidth;
      let zone = null;
      bar.setPointerCapture(ev.pointerId);

      const move = (e) => {
        // A barra de título nunca sai do ecrã: fica sempre uma aba de
        // 90 píxeis por onde se possa voltar a agarrar a janela.
        win.style.setProperty('--x', Math.max(-ww + 90, Math.min(W - 90, o.x + e.clientX - startX)) + 'px');
        win.style.setProperty('--y', Math.max(0, Math.min(H - 44, o.y + e.clientY - startY)) + 'px');

        const r = desk.els.layer.getBoundingClientRect();
        const next = desk.snap.zoneAt(e.clientX - r.left, e.clientY - r.top, W);
        if (next !== zone) {
          zone = next;
          desk.snap.show(zone);
        }
      };
      const up = () => {
        bar.removeEventListener('pointermove', move);
        bar.removeEventListener('pointerup', up);
        bar.removeEventListener('pointercancel', up);
        if (zone) desk.snap.to(win, zone);
        desk.snap.show(null);
        zone = null;
      };
      bar.addEventListener('pointermove', move);
      bar.addEventListener('pointerup', up);
      bar.addEventListener('pointercancel', up);
      ev.preventDefault();
    });
  }

  function wireResize(win, id, grip, api) {
    grip.addEventListener('pointerdown', (ev) => {
      if (ev.button !== 0) return;
      const dir = grip.dataset.dir;
      const app = desk.meta(id);
      const sx = ev.clientX;
      const sy = ev.clientY;
      const o = api.rectOf(win);
      const { w: W, h: H } = desk.area();
      grip.setPointerCapture(ev.pointerId);

      const move = (e) => {
        const dx = e.clientX - sx;
        const dy = e.clientY - sy;
        let { x, y, w, h } = o;
        // O mínimo da aplicação de um lado, a borda do ecrã do outro.
        if (dir.includes('e')) w = Math.min(W - o.x, Math.max(app.win.minW, o.w + dx));
        if (dir.includes('s')) h = Math.min(H - o.y, Math.max(app.win.minH, o.h + dy));
        if (dir.includes('w')) {
          w = Math.min(o.x + o.w, Math.max(app.win.minW, o.w - dx));
          x = o.x + (o.w - w);
        }
        if (dir.includes('n')) {
          h = Math.min(o.y + o.h, Math.max(app.win.minH, o.h - dy));
          y = Math.max(0, o.y + (o.h - h));
        }
        api.setRect(win, { x, y, w, h });
      };
      const up = () => {
        grip.removeEventListener('pointermove', move);
        grip.removeEventListener('pointerup', up);
        grip.removeEventListener('pointercancel', up);
      };
      grip.addEventListener('pointermove', move);
      grip.addEventListener('pointerup', up);
      grip.addEventListener('pointercancel', up);
      ev.preventDefault();
    });
  }

  return { wire };
}
