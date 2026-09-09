// ─────────────────────────────────────────────────────────────────────
// O Mac.
//
// Este ficheiro não faz nada: encontra os nós, monta o objecto `desk`
// que todas as peças partilham, e junta-as pela ordem em que precisam
// umas das outras.
//
//   dialogs    a caixa de aviso — não depende de ninguém
//   dock       o ponto, o salto, a ampliação
//   snap       encaixar nas margens
//   dragging   arrastar e redimensionar
//   windows    abrir, fechar, focar, minimizar, ampliar, empilhar
//   menus      a barra e o botão direito
//   spotlight  a pesquisa (⌘K)
//   switcher   o ⌘Tab
//   keys       os atalhos, num sítio só
//
// `desk` é o que substitui o closure gigante que isto era: cada peça
// recebe-o, lê o que precisa, e pendura-lhe o que oferece. Uma peça
// nova é um ficheiro nesta pasta e uma linha aqui.
// ─────────────────────────────────────────────────────────────────────
import { prefs } from '../state.js';
import { createDialogs } from './dialogs.js';
import { createDock } from './dock.js';
import { createSnap } from './snap.js';
import { createDragging } from './dragging.js';
import { createWindows } from './windows.js';
import { createMenus } from './menus.js';
import { createSpotlight } from './spotlight.js';
import { createSwitcher } from './switcher.js';
import { createToast } from './toast.js';
import { wireKeys } from './keys.js';

export function createMac(ctx) {
  const els = {
    root: document.getElementById('mac'),
    layer: document.getElementById('windows'),
    dock: document.getElementById('dock'),
    menubar: document.getElementById('menubar'),
    menuApp: document.getElementById('menuApp'),
    spotlight: document.getElementById('spotlight'),
    spotInput: document.getElementById('spotInput'),
    spotResults: document.getElementById('spotResults'),
  };

  const desk = {
    ctx,
    els,
    s: ctx.data.strings,
    /** As janelas abertas, por id de aplicação. */
    wins: new Map(),
    /** O ambiente de trabalho: tudo menos a barra de menus. */
    area: () => {
      const r = els.layer.getBoundingClientRect();
      return { w: r.width, h: r.height };
    },
    meta: (id) => ctx.data.apps.find((a) => a.id === id),
    wallpaper: () => prefs.wallpaper,
  };

  desk.dialogs = createDialogs(desk);
  desk.dock = createDock(desk);
  desk.snap = createSnap(desk);
  desk.dragging = createDragging(desk);
  desk.windows = createWindows(desk);
  desk.menus = createMenus(desk);
  desk.spotlight = createSpotlight(desk);
  desk.switcher = createSwitcher(desk);
  desk.toast = createToast(desk);
  wireKeys(desk);

  function teardown() {
    desk.windows.teardown();
    desk.menus.closeAll();
    desk.spotlight.close();
  }

  // O que o resto do sistema pode pedir ao Mac — e só isso. Tudo o que
  // não está aqui é assunto interno das peças lá dentro.
  return {
    open: desk.windows.open,
    close: desk.windows.close,
    minimize: desk.windows.minimize,
    zoom: desk.windows.zoom,
    tile: desk.windows.tile,
    closeAll: desk.windows.closeAll,
    spotOpen: desk.spotlight.open,
    openAppSwitcher: desk.switcher.open,
    notify: desk.toast.notify,
    teardown,
  };
}
