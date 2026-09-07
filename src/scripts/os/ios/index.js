// ─────────────────────────────────────────────────────────────────────
// O telefone.
//
// Ecrã inicial com páginas, aplicações que abrem a partir do próprio
// ícone, e gestos que seguem o dedo em tempo real: subir para o início,
// segurar para o comutador, puxar de cima para a Central de Controlo ou
// para as notificações, arrastar da margem para voltar atrás, e
// deslizar para desbloquear.
//
// Este ficheiro é só o mapa, como o do Mac. As peças partilham um
// objecto `ph`, e as que precisam umas das outras chamam-se através
// dele — nunca por importação directa, porque se chamam em círculo:
// abrir uma app fecha os painéis, e o comutador abre apps.
//
//   island    a ilha que estica para dizer uma coisa
//   motion    a fórmula que abrir, fechar e arrastar partilham
//   panels    a Central de Controlo e as notificações
//   views     as vistas de aplicação e a barra inferior
//   switcher  os cartões que se arrastam para fora
//   pages     as páginas do ecrã inicial
//   lock      o ecrã bloqueado
//   back      voltar atrás pela margem esquerda
//   search    puxar o ecrã inicial para baixo abre a pesquisa
// ─────────────────────────────────────────────────────────────────────
import { createMotion } from './motion.js';
import { createIsland } from './island.js';
import { createPanels } from './panels.js';
import { createViews } from './views.js';
import { createSwitcher } from './switcher.js';
import { createPages } from './pages.js';
import { createLock } from './lock.js';
import { wireBackGesture } from './back.js';
import { wireSearch } from './search.js';

export function createPhone(ctx) {
  const els = {
    phone: document.getElementById('phone'),
    sb: document.getElementById('springboard'),
    pages: document.getElementById('sbPages'),
    dots: document.getElementById('sbDots'),
    layer: document.getElementById('iosViews'),
    cc: document.getElementById('cc'),
    nc: document.getElementById('nc'),
    lock: document.getElementById('lock'),
    homebar: document.getElementById('homebar'),
    island: document.getElementById('island'),
    switcher: document.getElementById('switcher'),
  };

  const ph = {
    ctx,
    els,
    s: ctx.data.strings,
    /** Os nós das vistas já construídas, por id de aplicação. */
    viewEls: new Map(),
    /** A ordem por que foram usadas — a última é a de cima. */
    stack: [],
    /** Que aplicação está à vista, ou null se for o ecrã inicial. */
    current: null,
    meta: (id) => ctx.data.apps.find((a) => a.id === id),
    iconFor: (id) => document.querySelector('.sb-app[data-open="' + id + '"] svg'),
  };

  ph.motion = createMotion(ph);
  ph.island = createIsland(ph);
  ph.panels = createPanels(ph);
  ph.views = createViews(ph);
  ph.switcher = createSwitcher(ph);
  ph.pages = createPages(ph);
  ph.lock = createLock(ph);
  wireBackGesture(ph);
  wireSearch(ph);

  // O que o resto do sistema pode pedir ao telefone — e só isso. Tudo o
  // que não está aqui é assunto interno das peças lá dentro.
  return {
    open: ph.views.open,
    close: ph.views.close,
    teardown: ph.views.teardown,
    notify: ph.island.notify,
    syncCC: ph.panels.syncCC,
    openSwitcher: ph.switcher.open,
    showLock: ph.lock.show,
    unlock: ph.lock.unlock,
    page: ph.pages.current,
  };
}
