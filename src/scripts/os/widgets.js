// ─────────────────────────────────────────────────────────────────────
// Os widgets: os que estão e os que se acrescentam.
//
// Servem os dois mundos. No telefone vivem nas páginas do ecrã inicial
// e editam-se como no iPhone: manter o dedo, os ícones tremem, aparece
// o «+» e cada widget ganha o seu «−». No Mac vivem no ambiente de
// trabalho e editam-se pelo menu do botão direito. A galeria é a
// mesma, e a escolha fica guardada com as outras preferências.
//
// O HTML de cada widget está uma vez só, num molde em Widgets.astro:
// aqui clona-se. É isso que deixa acrescentar um tipo novo sem tocar
// neste ficheiro — um molde, uma linha em SIZE, um nome nas línguas.
// ─────────────────────────────────────────────────────────────────────
import { prefs, setPref, refreshClock } from './state.js';
import { track } from './gesture.js';

/** O que há quando ninguém escolheu nada. */
const DEFAULT = { p1: ['date', 'post'], p2: ['list', 'links'], mac: [] };

/** Pequeno ocupa uma coluna; médio ocupa as duas. */
const SIZE = { date: 'small', clock: 'small', post: 'medium', list: 'medium', links: 'medium' };

/** Quanto tempo o dedo fica quieto até o ecrã inicial entrar em edição. */
const HOLD_MS = 550;

export function createWidgets(ctx) {
  const s = ctx.data.strings.widgets;
  const root = document.documentElement;
  const gallery = document.getElementById('wgal');
  const sb = document.getElementById('springboard');
  const slots = {};
  document.querySelectorAll('[data-widgets]').forEach((el) => (slots[el.dataset.widgets] = el));

  const mould = (type) => document.querySelector('template[data-widget="' + type + '"]');
  const layout = () => Object.assign({}, DEFAULT, prefs.widgets || {});

  /** Um widget novo a partir do molde, ou nada se o tipo não existir. */
  function make(type) {
    const t = mould(type);
    if (!t || !t.content.firstElementChild) return null;
    const node = t.content.firstElementChild.cloneNode(true);
    node.classList.add(SIZE[type] || 'medium');
    node.dataset.type = type;
    return node;
  }

  function render() {
    const lay = layout();
    Object.keys(slots).forEach((slot) => {
      const host = slots[slot];
      host.textContent = '';
      (lay[slot] || []).forEach((type, i) => {
        const node = make(type);
        if (!node) return;
        node.dataset.slot = slot;
        node.dataset.index = String(i);
        const rm = document.createElement('button');
        rm.type = 'button';
        rm.className = 'w-remove';
        rm.setAttribute('aria-label', s.remove);
        rm.textContent = '−';
        node.appendChild(rm);
        host.appendChild(node);
      });
    });
    refreshClock();
    // Os widgets acabaram de mudar de altura — as páginas do telefone
    // têm de recontar quantas linhas de ícones ainda cabem por baixo.
    if (ctx.phone && ctx.phone.reflowPages) ctx.phone.reflowPages();
  }

  function save(lay) {
    setPref('widgets', lay);
    render();
  }

  /** A galeria mostra cada tipo tal como ele fica, em ponto pequeno. */
  function fillGallery() {
    if (!gallery) return;
    gallery.querySelectorAll('[data-wgal-type]').forEach((item) => {
      const preview = item.querySelector('.wgal-preview');
      if (!preview || preview.firstChild) return;
      const node = make(item.dataset.wgalType);
      if (node) preview.appendChild(node);
    });
    refreshClock();
  }

  // ── Editar ─────────────────────────────────────────────────────────
  let target = 'p1';
  const editing = () => root.classList.contains('editing-widgets');
  function edit(on) {
    root.classList.toggle('editing-widgets', on);
    if (!on && gallery) gallery.hidden = true;
  }

  /** Para onde vai o widget novo: a página à vista, ou o Mac. */
  const where = () => (ctx.mode === 'mac' ? 'mac' : 'p' + ((ctx.phone && ctx.phone.page()) + 1));

  function openGallery() {
    if (!gallery) return;
    target = where();
    fillGallery();
    gallery.hidden = false;
  }

  document.addEventListener('click', (ev) => {
    const rm = ev.target.closest('.w-remove');
    if (rm) {
      ev.preventDefault();
      ev.stopPropagation();
      const w = rm.parentElement;
      const lay = layout();
      lay[w.dataset.slot] = (lay[w.dataset.slot] || []).filter((_, i) => i !== Number(w.dataset.index));
      save(lay);
      return;
    }
    const add = ev.target.closest('[data-widget-add]');
    if (add) {
      const lay = layout();
      lay[target] = (lay[target] || []).concat(add.dataset.widgetAdd);
      save(lay);
      if (gallery) gallery.hidden = true;
      return;
    }
    if (ev.target.closest('[data-widgets-open]')) return openGallery();
    if (ev.target.closest('[data-widgets-done]')) return edit(false);
    if (gallery && (ev.target === gallery || ev.target.closest('[data-wgal-close]'))) gallery.hidden = true;
  });

  // Manter o dedo no ecrã inicial. Um toque fora de tudo, em edição, sai.
  if (sb) {
    let timer = 0;
    const stop = () => clearTimeout(timer);
    track(
      sb,
      {
        down: (g, ev) => {
          stop();
          if (ctx.mode !== 'ios' || editing() || ev.target.closest('.ios-dock, .sb-dots, .sb-edit')) return;
          timer = setTimeout(() => edit(true), HOLD_MS);
        },
        begin: stop,
        end: stop,
        tap: (g, ev) => {
          stop();
          if (editing() && ev && !ev.target.closest('.widget, .sb-app, button, a')) edit(false);
        },
      },
      { threshold: 8 }
    );
  }

  render();

  return {
    /** Entra em edição e abre logo a galeria — é o que o menu do Mac pede. */
    edit: () => {
      edit(true);
      openGallery();
    },
    editing,
  };
}
