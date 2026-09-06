// Arranque. Junta o estado, o Mac, o telefone e as aplicações — e
// decide qual dos dois mundos mostrar.
import {
  prefs,
  setPref,
  applyPrefs,
  effectiveTheme,
  detectMode,
  onModeChange,
  startClock,
  seenThisSession,
  forcedPhone,
} from './state.js';
import { createMac } from './mac.js';
import { createPhone } from './ios.js';
import { initApps } from './apps.js';

const node = document.getElementById('os-data');
if (node) boot(JSON.parse(node.textContent));

function boot(data) {
  const os = document.getElementById('os');
  const pool = document.getElementById('pool');
  const content = new Map();
  document.querySelectorAll('[data-content]').forEach((el) => content.set(el.dataset.content, el));

  const ctx = {
    data,
    mode: detectMode(),
    active: null,
    contentNode: (id) => content.get(id) || null,
    contentEl: (id) => content.get(id),
    releaseContent: (id) => {
      const el = content.get(id);
      if (el) pool.appendChild(el);
    },
    setOpen: () => {},
    syncSettings: () => {},
    notify: () => {},
    run,
  };

  // Assim que o módulo corre, o sistema está de pé: a rede de segurança
  // do <head> deixa de fazer falta.
  os.classList.add('ready');
  applyPrefs();
  startClock(data.intlLocale || undefined);
  initApps(ctx);

  const mac = createMac(ctx);
  const phone = createPhone(ctx);
  ctx.phone = phone;
  ctx.notify = (text) => phone.notify(text);

  // ── Abrir e fechar ────────────────────────────────────────────
  function openApp(id, from) {
    if (!data.apps.some((a) => a.id === id)) return;
    // Abrir alguma coisa a partir do ecrã bloqueado desbloqueia-o antes.
    if (ctx.mode === 'ios') phone.unlock();
    if (ctx.mode === 'mac') mac.open(id);
    else phone.open(id, from);
    if (id === 'simulador' && ctx.loadSimulator) ctx.loadSimulator();
    if (id === 'terminal' && ctx.focusTerminal) ctx.focusTerminal();
    if (id === 'contacto' && ctx.prepareContact) ctx.prepareContact();
  }

  function closeApp(id) {
    if (ctx.mode === 'mac') mac.close(id);
    else phone.close(id);
  }

  function openPost(slug, from) {
    openApp('escritos', from);
    if (ctx.escritos) ctx.escritos.show(slug, true);
  }

  function run(action) {
    if (!action) return;
    const [kind, value] = action.split(':');
    switch (kind) {
      case 'open':
        return openApp(value);
      case 'post':
        return openPost(value);
      case 'wallpaper':
        setPref('wallpaper', value);
        return ctx.syncSettings();
      case 'link':
        return window.open(data.site[value], '_blank', 'noopener');
      case 'mail':
        location.href = 'mailto:' + data.site.email;
        return;
      case 'theme':
        setPref('theme', effectiveTheme() === 'dark' ? 'light' : 'dark');
        return ctx.syncSettings();
      case 'lang':
        location.href = data.altHome;
        return;
      case 'spotlight':
        return mac.spotOpen();
      case 'switcher':
        return ctx.mode === 'mac' ? mac.openAppSwitcher() : phone.openSwitcher();
      case 'minimize':
        return mac.minimize();
      case 'zoom':
        return mac.zoom();
      case 'tile':
        return mac.tile();
      case 'closeAll':
        return mac.closeAll();
      case 'close':
        if (ctx.active) closeApp(ctx.active);
        return;
      case 'back':
        if (ctx.escritos && ctx.escritos.hasDetail()) ctx.escritos.list(true);
        return;
      case 'restart':
        document.getElementById('boot').hidden = false;
        setTimeout(() => location.reload(), 900);
        return;
      default:
        return;
    }
  }

  // ── Cliques globais ───────────────────────────────────────────
  document.addEventListener('click', (ev) => {
    const post = ev.target.closest('[data-open-post]');
    if (post) {
      ev.preventDefault();
      openPost(post.dataset.openPost, post);
      return;
    }
    const opener = ev.target.closest('[data-open]');
    if (opener) {
      ev.preventDefault();
      openApp(opener.dataset.open, opener.querySelector('svg') || opener);
    }
  });

  // ── Modo ──────────────────────────────────────────────────────
  function applyMode(next) {
    if (next === ctx.mode) return;
    const wasActive = ctx.active;
    if (ctx.mode === 'mac') mac.teardown();
    else phone.teardown();
    ctx.mode = next;
    ctx.active = null;
    document.documentElement.setAttribute('data-mode', next);
    if (wasActive) openApp(wasActive);
  }
  document.documentElement.setAttribute('data-mode', ctx.mode);
  onModeChange(applyMode);

  // ── Navegação do browser ──────────────────────────────────────
  window.addEventListener('popstate', (ev) => {
    const state = ev.state || {};
    if (state.post && ctx.escritos) {
      openApp('escritos');
      ctx.escritos.show(state.post, false);
    } else if (ctx.escritos) {
      ctx.escritos.list(false);
    }
  });

  // ── Sequência de arranque ─────────────────────────────────────
  const first = !seenThisSession('helderos-booted') && !forcedPhone;
  const bootEl = document.getElementById('boot');

  function ready() {
    const start = data.boot || (ctx.mode === 'mac' ? data.bootMac : null);
    if (start) {
      openApp(start);
      if (data.bootPost && ctx.escritos) ctx.escritos.show(data.bootPost, false);
    }
  }

  if (first) {
    bootEl.hidden = false;
    setTimeout(() => {
      os.classList.add('booted');
      setTimeout(() => {
        bootEl.hidden = true;
        os.classList.remove('booted');
      }, 460);
      if (ctx.mode === 'ios') phone.showLock();
      ready();
    }, 2650);
  } else {
    ready();
  }
}
