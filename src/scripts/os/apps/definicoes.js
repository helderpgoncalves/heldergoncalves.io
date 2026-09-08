import { prefs, setPref, resetPrefs, applyPrefs } from '../state.js';

export function initSettings(ctx) {
  const el = ctx.contentNode('definicoes');
  if (!el) return;

  function sync() {
    applyPrefs();
    el.querySelectorAll('[data-set]').forEach((group) => {
      const kind = group.dataset.set;
      const value = kind === 'lang' ? ctx.data.lang : prefs[kind];
      group.querySelectorAll('[data-value]').forEach((b) => {
        b.setAttribute('aria-pressed', b.dataset.value === value ? 'true' : 'false');
      });
    });
  }

  el.addEventListener('click', (ev) => {
    const b = ev.target.closest('[data-value]');
    if (b) {
      const kind = b.closest('[data-set]').dataset.set;
      if (kind === 'lang') {
        if (b.dataset.value !== ctx.data.lang) location.href = b.dataset.href;
        return;
      }
      setPref(kind, b.dataset.value);
      sync();
      ctx.syncSettings();
      return;
    }
    if (ev.target.closest('[data-reset-os]')) {
      resetPrefs();
      location.reload();
    }
    const action = ev.target.closest('[data-action]');
    if (action) ctx.run(action.dataset.action);
  });

  ctx.syncSettings = () => {
    sync();
    if (ctx.phone) ctx.phone.syncCC();
  };
  sync();
}
