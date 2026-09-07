// Arranque. Junta o estado, o Mac, o telefone e as aplicações — e
// decide qual dos dois mundos mostrar.
import {
  prefs,
  setPref,
  applyPrefs,
  effectiveTheme,
  reducedMotion,
  detectMode,
  onModeChange,
  startClock,
  seenThisSession,
  forgetSession,
  forcedPhone,
} from './state.js';
import { createMac } from './mac/index.js';
import { createPhone } from './ios/index.js';
import { initApps } from './apps/index.js';
import { createWidgets } from './widgets.js';

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
  ctx.widgets = createWidgets(ctx);

  // ── Abrir e fechar ────────────────────────────────────────────
  function openApp(id, from) {
    const app = data.apps.find((a) => a.id === id);
    if (!app) return;
    // Um iPhone dentro de um iPhone não faz sentido: o Simulador é só do Mac.
    if (app.macOnly && ctx.mode === 'ios') return;
    // Abrir alguma coisa a partir do ecrã bloqueado desbloqueia-o antes.
    if (ctx.mode === 'ios') phone.unlock();
    if (ctx.mode === 'mac') mac.open(id, from);
    else phone.open(id, from);
    if (id === 'simulador' && ctx.loadSimulator) ctx.loadSimulator();
    if (id === 'terminal' && ctx.focusTerminal) ctx.focusTerminal();
    if (id === 'contacto' && ctx.prepareContact) ctx.prepareContact();
    if (id === 'mensagens' && ctx.prepareChat) ctx.prepareChat();
    if (id === 'escritos' && ctx.prepareSubscribe) ctx.prepareSubscribe();
    if (id === 'bolsa' && ctx.prepareStocks) ctx.prepareStocks();
    if (id === 'calendario' && ctx.prepareCalendar) ctx.prepareCalendar();
  }

  function closeApp(id) {
    if (id === 'bolsa' && ctx.pauseStocks) ctx.pauseStocks();
    if (ctx.mode === 'mac') mac.close(id);
    else phone.close(id);
  }

  function openPost(slug, from) {
    openApp('escritos', from);
    if (ctx.escritos) ctx.escritos.show(slug, true);
  }

  const WALLPAPERS = ['aurora', 'sonoma', 'night', 'graphite'];
  const nextWallpaper = () => WALLPAPERS[(WALLPAPERS.indexOf(prefs.wallpaper) + 1) % WALLPAPERS.length];

  function copyLink() {
    const done = () => {
      if (ctx.mode === 'ios') ctx.notify(data.strings.copied);
    };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(location.href).then(done, () => {});
    }
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
        setPref('wallpaper', value === 'next' ? nextWallpaper() : value);
        return ctx.syncSettings();
      case 'copy':
        return copyLink();
      case 'share':
        // Onde houver folha de partilha do sistema, é essa; senão copia-se.
        if (navigator.share) {
          navigator.share({ title: document.title, url: location.href }).catch(() => {});
          return;
        }
        return copyLink();
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
      case 'widgets':
        return ctx.widgets.edit();
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
      case 'closeApp':
        return closeApp(value);
      case 'back':
        if (ctx.escritos && ctx.escritos.hasDetail()) ctx.escritos.list(true);
        return;
      case 'restart':
        // Um reinício a sério: o ecrã apaga-se, e o arranque que vem a
        // seguir é o primeiro outra vez — a saudação escreve-se toda.
        // Mostrar a saudação antes de recarregar cortava-a a meio.
        forgetSession('helderos-booted');
        os.classList.add('off');
        setTimeout(() => location.reload(), 700);
        return;
      default:
        return;
    }
  }

  // ── Cliques globais ───────────────────────────────────────────
  document.addEventListener('click', (ev) => {
    // Em edição de widgets, tocar num ícone não abre nada — como no iPhone.
    if (ctx.widgets && ctx.widgets.editing() && ev.target.closest('.sb, .desk-widgets')) {
      ev.preventDefault();
      return;
    }
    const post = ev.target.closest('[data-open-post]');
    if (post) {
      ev.preventDefault();
      openPost(post.dataset.openPost, post);
      return;
    }
    const opener = ev.target.closest('[data-open]');
    if (!opener) return;
    ev.preventDefault();
    // No ambiente de trabalho do Mac um clique escolhe; abre-se com dois,
    // ou com o Enter (que chega como clique sem contagem).
    if (ctx.mode === 'mac' && opener.classList.contains('desk-icon') && ev.detail === 1) {
      document.querySelectorAll('.desk-icon.selected').forEach((el) => el.classList.remove('selected'));
      opener.classList.add('selected');
      return;
    }
    openApp(opener.dataset.open, opener.querySelector('svg') || opener);
  });
  document.addEventListener('pointerdown', (ev) => {
    if (ctx.mode === 'mac' && !ev.target.closest('.desk-icon')) {
      document.querySelectorAll('.desk-icon.selected').forEach((el) => el.classList.remove('selected'));
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

  // ── Vidro ─────────────────────────────────────────────────────
  // A refração é decidida em CSS, com `@supports`. Não há nada a
  // injectar: houve, e estava errado — uma camada-filha com
  // `backdrop-filter` dentro de um backdrop root não amostra nada.

  // No Mac, a luz vem de onde está o rato: o aro das superfícies
  // acompanha, como acontece quando se inclina um telefone.
  if (ctx.mode === 'mac' && !reducedMotion()) {
    let queued = false;
    let angle = 145;
    document.addEventListener('pointermove', (ev) => {
      const x = ev.clientX / (window.innerWidth || 1);
      const y = ev.clientY / (window.innerHeight || 1);
      angle = 90 + (x - 0.5) * 120 + (y - 0.5) * 60;
      if (queued) return;
      queued = true;
      requestAnimationFrame(() => {
        queued = false;
        document.documentElement.style.setProperty('--glass-angle', angle.toFixed(1) + 'deg');
      });
    });
  }

  // ── Funcionar sem rede ────────────────────────────────────────
  // Registado depois do arranque, para não competir com o que interessa.
  if ('serviceWorker' in navigator && location.protocol === 'https:') {
    window.addEventListener('load', () => {
      setTimeout(() => {
        navigator.serviceWorker.register('/sw.js').catch(() => {});
      }, 1200);
    });
  }

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
    // A saudação diz quanto tempo leva a escrever-se; fica mais um
    // instante a ver-se, e só depois se vai embora.
    const hand = bootEl.querySelector('[data-wrote]');
    const wrote = (hand && parseInt(hand.dataset.wrote, 10)) || 3500;
    setTimeout(() => {
      os.classList.add('booted');
      setTimeout(() => {
        bootEl.hidden = true;
        os.classList.remove('booted');
      }, 460);
      if (ctx.mode === 'ios') phone.showLock();
      ready();
    }, reducedMotion() ? 900 : wrote + 900);
  } else {
    ready();
  }
}
