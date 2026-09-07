import { setPref, effectiveTheme } from '../state.js';
import { esc } from '../lib/dom.js';

export function initTerminal(ctx) {
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
