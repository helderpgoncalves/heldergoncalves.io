// O que cada aplicação faz por dentro. Ligado uma vez ao conteúdo —
// os nós movem-se entre janelas e vistas, os listeners vão com eles.
import { prefs, setPref, resetPrefs, applyPrefs, effectiveTheme } from './state.js';

const esc = (s) =>
  String(s).replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]);

export function initApps(ctx) {
  initEscritos(ctx);
  initTerminal(ctx);
  initChat(ctx);
  initCompose(ctx);
  initSettings(ctx);
  initSimulator(ctx);
}

// ── Escritos ────────────────────────────────────────────────────
function initEscritos(ctx) {
  const el = ctx.contentNode('escritos');
  if (!el) return;
  const reader = el.querySelector('[data-reader]');
  const cache = new Map();
  const seeded = el.querySelector('[data-post-body]');
  if (seeded) cache.set(seeded.dataset.postBody, seeded.outerHTML);

  const post = (slug) => ctx.data.posts.find((p) => p.slug === slug);

  function mark(slug) {
    el.querySelectorAll('.post-link').forEach((a) => {
      if (slug && a.dataset.post === slug) a.setAttribute('aria-current', 'true');
      else a.removeAttribute('aria-current');
    });
  }

  async function show(slug, push) {
    const p = post(slug);
    if (!p) return;
    if (!cache.has(slug)) {
      reader.innerHTML = '<div class="app-main-empty"><p>…</p></div>';
      try {
        const res = await fetch(p.url, { headers: { Accept: 'text/html' } });
        if (!res.ok) throw new Error('http ' + res.status);
        const doc = new DOMParser().parseFromString(await res.text(), 'text/html');
        const body = doc.querySelector('[data-post-body]');
        if (!body) throw new Error('sem corpo');
        cache.set(slug, body.outerHTML);
      } catch (_) {
        location.href = p.url;
        return;
      }
    }
    reader.innerHTML = cache.get(slug);
    reader.scrollTop = 0;
    el.dataset.detail = '1';
    mark(slug);
    document.title = p.title + ' — ' + ctx.data.site.name;
    if (push) history.pushState({ app: 'escritos', post: slug }, '', p.url);
  }

  function list(push) {
    el.dataset.detail = '0';
    reader.innerHTML =
      '<div class="app-main-empty"><svg viewBox="0 0 100 100" width="42" height="42" aria-hidden="true">' +
      '<use href="#ui-note"/></svg><p>' +
      esc(ctx.data.strings.escritos.pick) +
      '</p></div>';
    mark(null);
    if (push) history.pushState({ app: 'escritos' }, '', ctx.data.routes[ctx.data.lang].blog);
  }

  el.addEventListener('click', (ev) => {
    const link = ev.target.closest('.post-link');
    if (link) {
      ev.preventDefault();
      show(link.dataset.post, true);
      return;
    }
    if (ev.target.closest('[data-back-list]')) list(true);
  });

  ctx.escritos = {
    show,
    list,
    hasDetail: () => el.dataset.detail === '1',
    pane: () => el.querySelector('.app-main'),
  };
}

// ── Terminal ────────────────────────────────────────────────────
function initTerminal(ctx) {
  const el = ctx.contentNode('terminal');
  if (!el) return;
  const out = el.querySelector('[data-term-out]');
  const input = el.querySelector('[data-term-input]');
  const term = el.querySelector('[data-term]');
  const t = ctx.data.strings.terminal;
  const history = [];
  let cursor = 0;

  const print = (html) => {
    out.insertAdjacentHTML('beforeend', '\n' + html);
    term.scrollTop = term.scrollHeight;
  };

  const helpTable = () =>
    t.help.map(([cmd, desc]) => `  <b>${esc(cmd.padEnd(18))}</b><span class="muted">${esc(desc)}</span>`).join('\n');

  const listPosts = () =>
    ctx.data.posts.map((p, i) => `  <i>${i + 1}.</i> ${esc(p.title)} <span class="muted">— ${esc(p.date)}</span>`).join('\n') ||
    '  <span class="muted">—</span>';

  const neofetch = () =>
    [
      `  <b>helder</b>@<b>${esc(location.hostname || 'heldergoncalves.io')}</b>`,
      '  ────────────────────────',
      `  <i>OS</i>        ${esc(ctx.data.strings.macName)} 1.0`,
      '  <i>Shell</i>     zsh (a fingir)',
      '  <i>Stack</i>     TypeScript · Python · Astro',
      `  <i>Modo</i>      ${ctx.mode === 'ios' ? 'iPhone' : 'Mac'}`,
      `  <i>Tema</i>      ${effectiveTheme()}`,
      `  <i>Escritos</i>  ${ctx.data.posts.length}`,
      `  <i>Frameworks</i> 0`,
    ].join('\n');

  function run(raw) {
    const line = raw.trim();
    print(`<span class="ps1">helder ~ %</span> ${esc(raw)}`);
    if (!line) return;
    history.push(line);
    cursor = history.length;
    const [cmd, ...rest] = line.split(/\s+/);
    const arg = rest.join(' ');
    const c = cmd.toLowerCase();

    if (['ajuda', 'help', '?'].includes(c)) return print(helpTable());
    if (['sobre', 'about', 'whoami'].includes(c)) {
      ctx.run('open:sobre');
      return print('  ' + esc(ctx.data.apps.find((a) => a.id === 'sobre').subtitle));
    }
    if (['escritos', 'writing', 'blog', 'ls'].includes(c)) return print(listPosts());
    if (['ler', 'read', 'cat'].includes(c)) {
      const n = parseInt(arg, 10);
      const p = ctx.data.posts[n - 1];
      if (!p) return print('  <span class="muted">' + esc(t.noPost) + '</span>');
      ctx.run('post:' + p.slug);
      return print('  → ' + esc(p.title));
    }
    if (['projetos', 'projects'].includes(c)) {
      ctx.run('open:projetos');
      return print('  ' + esc(t.openedApp) + ' projetos…');
    }
    if (['contacto', 'contact', 'email', 'mail'].includes(c)) {
      ctx.run('open:contacto');
      return print(`  <a href="mailto:${esc(ctx.data.site.email)}">${esc(ctx.data.site.email)}</a>`);
    }
    if (['abrir', 'open'].includes(c)) {
      const app = ctx.data.apps.find((a) => a.id === arg.toLowerCase() || a.name.toLowerCase() === arg.toLowerCase());
      if (!app) return print('  <span class="muted">' + esc(t.noApp) + '</span>');
      ctx.run('open:' + app.id);
      return print('  ' + esc(t.openedApp) + ' ' + esc(app.name) + '…');
    }
    if (['tema', 'theme'].includes(c)) {
      const v = arg.toLowerCase();
      const value = ['dark', 'escuro'].includes(v) ? 'dark' : ['light', 'claro'].includes(v) ? 'light' : 'auto';
      setPref('theme', value);
      ctx.syncSettings();
      return print('  → ' + value);
    }
    if (['idioma', 'lang'].includes(c)) {
      const v = arg.toLowerCase();
      if (v === 'pt' || v === 'en') {
        print('  → ' + v);
        setTimeout(() => (location.href = ctx.data.routes[v].home), 350);
        return;
      }
      return print('  <span class="muted">pt | en</span>');
    }
    if (['data', 'date'].includes(c)) return print('  ' + new Date().toString());
    if (c === 'neofetch') return print(neofetch());
    if (['limpar', 'clear'].includes(c)) {
      out.textContent = '';
      return;
    }
    if (c === 'sudo') return print('  <span class="muted">' + esc(t.sudo) + '</span>');
    if (c === 'echo') return print('  ' + esc(arg));
    if (['sair', 'exit'].includes(c)) {
      ctx.run('close');
      return;
    }
    print(`  <span class="muted">${esc(t.unknown)} ${esc(cmd)} — ${esc(t.hint)} ajuda</span>`);
  }

  input.addEventListener('keydown', (ev) => {
    if (ev.key === 'Enter') {
      run(input.value);
      input.value = '';
    } else if (ev.key === 'ArrowUp') {
      if (cursor > 0) input.value = history[--cursor] || '';
      ev.preventDefault();
    } else if (ev.key === 'ArrowDown') {
      cursor = Math.min(history.length, cursor + 1);
      input.value = history[cursor] || '';
      ev.preventDefault();
    }
  });
  term.addEventListener('click', (ev) => {
    if (!ev.target.closest('a')) input.focus();
  });
  ctx.focusTerminal = () => setTimeout(() => input.focus(), 120);
}

// ── Mensagens ───────────────────────────────────────────────────
// Conversa a sério quando o servidor tem uma chave de modelo, e as
// respostas guardadas quando não tem. O texto do modelo entra sempre
// como texto (textContent), nunca como HTML.
function initChat(ctx) {
  const el = ctx.contentNode('mensagens');
  if (!el) return;
  const log = el.querySelector('[data-chat-log]');
  const suggest = el.querySelector('[data-chat-suggest]');
  const form = el.querySelector('[data-chat-form]');
  const input = el.querySelector('[data-chat-input]');
  const note = el.querySelector('[data-chat-note]');
  const t = ctx.data.strings.chat;
  const canned = [...el.querySelectorAll('.chat-canned')];
  const opening = log.innerHTML;
  canned.forEach((c) => c.remove());

  let token = null;
  let live = false;
  let asked = false;
  let busy = false;
  let history = [];

  async function prepare() {
    if (asked) return;
    asked = true;
    try {
      const res = await fetch('/api/token', { headers: { Accept: 'application/json' } });
      if (!res.ok) return;
      const data = await res.json();
      live = data.chat === true;
      token = typeof data.token === 'string' ? data.token : null;
    } catch (_) {
      live = false;
    }
    if (note) note.textContent = live && token ? t.ai : t.aiOff;
  }
  ctx.prepareChat = prepare;

  const scroll = () => (log.scrollTop = log.scrollHeight);

  function bubble(side, text) {
    const p = document.createElement('p');
    p.className = 'bubble ' + side;
    p.textContent = text || '';
    log.appendChild(p);
    scroll();
    return p;
  }

  function typing() {
    const p = document.createElement('p');
    p.className = 'bubble them typing';
    p.setAttribute('aria-label', t.typing);
    p.innerHTML = '<i></i><i></i><i></i>';
    log.appendChild(p);
    scroll();
    return p;
  }

  /** Sem modelo: procura a resposta guardada mais próxima. */
  function cannedFor(text) {
    const q = text.toLowerCase();
    const exact = canned.find((c) => c.dataset.q.toLowerCase() === q);
    if (exact) return exact.querySelector('.bubble.them').textContent;
    const words = q.split(/\s+/).filter((w) => w.length > 3);
    let best = null;
    let bestScore = 0;
    for (const c of canned) {
      const hay = (c.dataset.q + ' ' + c.querySelector('.bubble.them').textContent).toLowerCase();
      const score = words.filter((w) => hay.includes(w)).length;
      if (score > bestScore) {
        bestScore = score;
        best = c;
      }
    }
    if (best && bestScore >= 2) return best.querySelector('.bubble.them').textContent;
    return t.unknown;
  }

  /** Escreve a resposta letra a letra. O texto chega inteiro do servidor
      — é mais barato e mais fiável do que streaming — e é aqui que ganha
      o ritmo de quem está a escrever do outro lado. */
  function typeOut(node, text) {
    return new Promise((done) => {
      if (document.documentElement.getAttribute('data-motion') === 'off') {
        node.textContent = text;
        scroll();
        return done();
      }
      let i = 0;
      const step = () => {
        i = Math.min(text.length, i + 2);
        node.textContent = text.slice(0, i);
        scroll();
        if (i < text.length) setTimeout(step, 14);
        else done();
      };
      step();
    });
  }

  async function talk() {
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, lang: ctx.data.lang, messages: history }),
    });
    if (res.status === 429) throw new Error('limite');
    const data = await res.json().catch(() => null);
    if (!res.ok || !data || !data.ok || typeof data.text !== 'string') throw new Error('upstream');
    return data.text;
  }

  async function ask(text) {
    const message = String(text || '').trim().slice(0, 600);
    if (!message || busy) return;
    busy = true;
    if (input) input.value = '';
    bubble('me', message);
    const chip = suggest.querySelector('[data-ask="' + CSS.escape(message) + '"]');
    if (chip) chip.remove();

    await prepare();
    const dots = typing();

    if (!live || !token) {
      const reply = cannedFor(message);
      setTimeout(() => {
        dots.remove();
        bubble('them', reply);
        busy = false;
      }, 550 + Math.random() * 350);
      return;
    }

    history.push({ role: 'user', content: message });
    history = history.slice(-8);
    try {
      const text = await talk();
      dots.remove();
      const answer = bubble('them', '');
      await typeOut(answer, text);
      history.push({ role: 'assistant', content: text });
    } catch (err) {
      if (dots.isConnected) dots.remove();
      bubble('them', err && err.message === 'limite' ? t.limit : t.error);
      history.pop();
    }
    busy = false;
  }

  suggest.addEventListener('click', (ev) => {
    const b = ev.target.closest('[data-ask]');
    if (b) return ask(b.dataset.ask);
    if (ev.target.closest('[data-ask-mail]')) location.href = 'mailto:' + ctx.data.site.email;
  });

  if (form)
    form.addEventListener('submit', (ev) => {
      ev.preventDefault();
      ask(input && input.value);
    });

  const reset = el.querySelector('[data-chat-reset]');
  if (reset)
    reset.addEventListener('click', () => {
      history = [];
      log.innerHTML = opening;
      log.querySelectorAll('.chat-canned').forEach((c) => c.remove());
      suggest.innerHTML = '';
      canned.forEach((c) => {
        const b = document.createElement('button');
        b.type = 'button';
        b.dataset.ask = c.dataset.q;
        b.textContent = c.dataset.q;
        suggest.appendChild(b);
      });
      const mail = document.createElement('button');
      mail.type = 'button';
      mail.dataset.askMail = '1';
      mail.textContent = ctx.data.site.email;
      suggest.appendChild(mail);
    });
}

// ── Contacto ────────────────────────────────────────────────────
// O envio passa pelo nosso servidor, que é quem tem a chave. Se o
// servidor não tiver email configurado, ou se falhar, abre-se o
// `mailto:` com tudo preenchido — a mensagem nunca se perde.
function initCompose(ctx) {
  const el = ctx.contentNode('contacto');
  if (!el) return;
  const form = el.querySelector('[data-compose]');
  const hint = el.querySelector('[data-compose-hint]');
  const t = ctx.data.strings.contact;

  let token = null;
  let enabled = false;
  let asked = false;
  let busy = false;

  const say = (text, tone) => {
    if (!hint) return;
    hint.textContent = text;
    hint.dataset.tone = tone || '';
  };

  /** Pede o token ao abrir a aplicação: o servidor recusa envios
      instantâneos, que é como os robôs trabalham. */
  async function prepare() {
    if (asked) return;
    asked = true;
    try {
      const res = await fetch('/api/token', { headers: { Accept: 'application/json' } });
      if (!res.ok) return;
      const data = await res.json();
      enabled = data.enabled === true;
      token = typeof data.token === 'string' ? data.token : null;
    } catch (_) {
      enabled = false;
    }
  }
  ctx.prepareContact = prepare;

  const fields = () => ({
    from: (form.querySelector('#c-from').value || '').trim(),
    subject: (form.querySelector('#c-subject').value || '').trim(),
    message: (form.querySelector('#c-body').value || '').trim(),
    company: (form.querySelector('#c-company') || { value: '' }).value,
  });

  function mailtoFallback(v, note) {
    const body = v.from ? v.message + '\n\n— ' + v.from : v.message;
    say(note || t.failed, 'warn');
    location.href =
      'mailto:' + ctx.data.site.email + '?subject=' + encodeURIComponent(v.subject) + '&body=' + encodeURIComponent(body);
  }

  form.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    if (busy) return;
    const v = fields();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.from)) return say(t.invalid, 'warn');
    if (v.message.length < 10) return say(t.short, 'warn');

    await prepare();
    if (!enabled || !token) return mailtoFallback(v, t.sendHint);

    busy = true;
    say(t.sending);
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...v, token }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.ok) {
        say(t.sent, 'ok');
        ctx.notify(t.sent);
        form.querySelector('#c-body').value = '';
        token = null;
        asked = false;
      } else if (res.status === 429) {
        say(t.limit, 'warn');
      } else {
        mailtoFallback(v);
      }
    } catch (_) {
      mailtoFallback(v);
    }
    busy = false;
  });

  const copy = el.querySelector('[data-copy-email]');
  if (copy)
    copy.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(ctx.data.site.email);
      } catch (_) {}
      copy.textContent = t.copied;
      say(t.copied, 'ok');
      ctx.notify(t.copied);
      setTimeout(() => {
        copy.textContent = t.copy;
        say(t.sendHint);
      }, 1800);
    });
}

// ── Definições ──────────────────────────────────────────────────
function initSettings(ctx) {
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
  });

  ctx.syncSettings = () => {
    sync();
    if (ctx.phone) ctx.phone.syncCC();
  };
  sync();
}

// ── Simulador ───────────────────────────────────────────────────
function initSimulator(ctx) {
  const el = ctx.contentNode('simulador');
  if (!el) return;
  const frame = el.querySelector('[data-sim-frame]');
  const depth = parseInt(new URLSearchParams(location.search).get('d') || '0', 10);

  ctx.loadSimulator = () => {
    if (depth >= 2) {
      el.querySelector('[data-sim]').innerHTML =
        '<div class="sim-deep"><svg viewBox="0 0 100 100" width="40" height="40" aria-hidden="true">' +
        '<use href="#icon-simulador"/></svg><p>∞</p></div>';
      return;
    }
    if (frame && !frame.src) {
      frame.src = ctx.data.routes[ctx.data.lang].home + '?device=1&d=' + (depth + 1);
    }
  };
}
