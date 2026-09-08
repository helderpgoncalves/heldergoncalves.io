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
//
// Arrastar e redimensionar passam pelo `track()` de gesture.js, como
// qualquer outro gesto do sistema — não por `pointerdown`/`pointermove`
// à mão (ver .claude/rules/cliente.md). Ao arrastar, sair dos limites
// do ecrã usa `rubber()`: a janela continua a seguir o rato, mas cada
// vez menos, em vez de parar de repente numa parede dura. Ao largar,
// `spring()` traz de volta o que ficou fora, a partir da velocidade
// que a mão trazia — a mesma física de qualquer gesto interrompível
// desta aplicação.
// ─────────────────────────────────────────────────────────────────────
import { track, rubber, clamp, spring } from '../gesture.js';

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

    let o = null;
    let ww = 0;
    let W = 0;
    let H = 0;
    let zone = null;
    let spr = null;

    track(
      bar,
      {
        filter: (ev) => !ev.target.closest('.light') && !win.classList.contains('zoomed'),
        down: () => {
          if (spr) spr.cancel();
          o = api.rectOf(win);
          ww = win.offsetWidth;
          ({ w: W, h: H } = desk.area());
        },
        move: (g) => {
          // A barra de título nunca sai do ecrã: fica sempre uma aba de
          // 90 píxeis por onde se possa voltar a agarrar a janela. Passar
          // desse limite não pára em seco — anda cada vez menos, como o
          // resto do sistema (rubber banding, gesture.js).
          const rawX = o.x + g.dx;
          const rawY = o.y + g.dy;
          const minX = -ww + 90;
          const maxX = W - 90;
          const minY = 0;
          const maxY = H - 44;
          const x = rawX < minX ? minX + rubber(rawX - minX, 120)
            : rawX > maxX ? maxX + rubber(rawX - maxX, 120)
            : rawX;
          const y = rawY < minY ? minY + rubber(rawY - minY, 120)
            : rawY > maxY ? maxY + rubber(rawY - maxY, 120)
            : rawY;
          win.style.setProperty('--x', x + 'px');
          win.style.setProperty('--y', y + 'px');

          const r = desk.els.layer.getBoundingClientRect();
          const next = desk.snap.zoneAt(g.x - r.left, g.y - r.top, W);
          if (next !== zone) {
            zone = next;
            desk.snap.show(zone);
          }
        },
        end: (g) => {
          // O último frame pode não ter chegado a aplicar-se (o `track()`
          // aplica o `move` no máximo uma vez por rAF — ver gesture.js) —
          // por isso o ponto de partida do que segue é sempre recalculado
          // a partir de `g`, nunca lido do estilo já escrito.
          const minX = -ww + 90;
          const maxX = W - 90;
          const minY = 0;
          const maxY = H - 44;
          const rawX = o.x + g.dx;
          const rawY = o.y + g.dy;
          const curX = rawX < minX ? minX + rubber(rawX - minX, 120)
            : rawX > maxX ? maxX + rubber(rawX - maxX, 120)
            : rawX;
          const curY = rawY < minY ? minY + rubber(rawY - minY, 120)
            : rawY > maxY ? maxY + rubber(rawY - maxY, 120)
            : rawY;
          win.style.setProperty('--x', curX + 'px');
          win.style.setProperty('--y', curY + 'px');

          if (zone) {
            desk.snap.to(win, zone);
          } else {
            // O que ficou elástico fora dos limites assenta com o embalo
            // que a mão trazia — não salta de repente para dentro.
            const cx = clamp(rawX, minX, maxX);
            const cy = clamp(rawY, minY, maxY);
            if (curX !== cx || curY !== cy) {
              const sx = spring(curX, cx, g.vx, (v) => win.style.setProperty('--x', v + 'px'));
              const sy = spring(curY, cy, g.vy, (v) => win.style.setProperty('--y', v + 'px'));
              spr = { cancel: () => { sx.cancel(); sy.cancel(); } };
            }
          }
          desk.snap.show(null);
          zone = null;
        },
      },
      { threshold: 0 }
    );
  }

  function wireResize(win, id, grip, api) {
    const dir = grip.dataset.dir;
    let o = null;
    let app = null;
    let W = 0;
    let H = 0;

    /** O rectângulo para uma dada distância arrastada — usado no
     * movimento normal e outra vez no fim, para o último ponto nunca se
     * perder ao throttling de frame do `track()` (ver flush em gesture.js). */
    const rectFor = (g) => {
      let { x, y, w, h } = o;
      // O mínimo da aplicação de um lado, a borda do ecrã do outro —
      // aqui é mesmo um limite, não uma resistência: esticar uma
      // janela além do ecrã não tem para onde "ceder".
      if (dir.includes('e')) w = Math.min(W - o.x, Math.max(app.win.minW, o.w + g.dx));
      if (dir.includes('s')) h = Math.min(H - o.y, Math.max(app.win.minH, o.h + g.dy));
      if (dir.includes('w')) {
        w = Math.min(o.x + o.w, Math.max(app.win.minW, o.w - g.dx));
        x = o.x + (o.w - w);
      }
      if (dir.includes('n')) {
        h = Math.min(o.y + o.h, Math.max(app.win.minH, o.h - g.dy));
        y = Math.max(0, o.y + (o.h - h));
      }
      return { x, y, w, h };
    };

    track(
      grip,
      {
        down: () => {
          app = desk.meta(id);
          o = api.rectOf(win);
          ({ w: W, h: H } = desk.area());
        },
        move: (g) => api.setRect(win, rectFor(g)),
        end: (g) => api.setRect(win, rectFor(g)),
      },
      { threshold: 0 }
    );
  }

  return { wire };
}
