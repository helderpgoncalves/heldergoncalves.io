import { setPref, effectiveTheme } from '../state.js';
import { esc } from '../lib/dom.js';

// O Terminal.app, com o zsh do macOS.
//
// O que faz isto parecer um terminal não são os comandos — é o
// comportamento da linha. O cursor é um bloco e não uma barra; o prompt
// é o `%n@%m %1~ %#` do macOS, sem cor; o `^C` deixa a linha escrita no
// registo e abre outra; as teclas do readline (Ctrl+A, Ctrl+E, Ctrl+U,
// Ctrl+K, Ctrl+W) fazem o que fazem numa consola a sério. Sem isso, é
// uma caixa de texto com letra monoespaçada.
//
// O `<input>` continua a existir por baixo do espelho, invisível: é ele
// que traz o teclado do telefone, o IME e o colar. Ver Terminal.astro.

/** O que o zsh escreve ao abrir uma sessão. Em inglês porque é o shell
 *  que a escreve, e o shell não fala português. */
function lastLogin() {
  const d = new Date();
  const dia = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d.getDay()];
  const mes = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][d.getMonth()];
  const dois = (n) => String(n).padStart(2, '0');
  const hora = `${dois(d.getHours())}:${dois(d.getMinutes())}:${dois(d.getSeconds())}`;
  return `Last login: ${dia} ${mes} ${dois(d.getDate())} ${hora} on ttys000`;
}

export function initTerminal(ctx) {
  const el = ctx.contentNode('terminal');
  if (!el) return;
  const out = el.querySelector('[data-term-out]');
  const input = el.querySelector('[data-term-input]');
  const term = el.querySelector('[data-term]');
  const echo = el.querySelector('[data-term-echo]');
  const ps1El = el.querySelector('[data-term-ps1]');
  const t = ctx.data.strings.terminal;
  const history = [];
  let cursor = 0;

  // O prompt por omissão do macOS: utilizador, arroba, máquina, a pasta
  // (`~`), e o `%` que o zsh usa onde o bash usaria `$`.
  const PS1 = `helder@${location.hostname || 'heldergoncalves.io'} ~ % `;
  ps1El.textContent = PS1;
  out.textContent = lastLogin() + '\n' + out.textContent;

  const scroll = () => (term.scrollTop = term.scrollHeight);
  const print = (html) => {
    out.insertAdjacentHTML('beforeend', '\n' + html);
    scroll();
  };

  // ── O espelho e o bloco ───────────────────────────────────────────
  /** Desenha o que está escrito, com o bloco onde o cursor está. O
      carácter por baixo do bloco continua lá — é o que o terminal faz:
      inverte-o, não o esconde. */
  function paint() {
    const v = input.value;
    const at = input.selectionStart ?? v.length;
    const sob = v.slice(at, at + 1) || ' ';
    echo.innerHTML =
      esc(v.slice(0, at)) + '<span class="term-cursor">' + esc(sob) + '</span>' + esc(v.slice(at + (v[at] ? 1 : 0)));
    scroll();
  }

  // ── O que o shell sabe ────────────────────────────────────────────
  const COMANDOS = [
    'ajuda', 'help', 'sobre', 'whoami', 'escritos', 'blog', 'ls', 'ler', 'cat', 'projetos',
    'contacto', 'mail', 'abrir', 'open', 'tema', 'theme', 'idioma', 'lang', 'date', 'pwd',
    'uname', 'neofetch', 'clear', 'limpar', 'sudo', 'echo', 'exit', 'sair',
  ];

  const helpTable = () =>
    t.help.map(([cmd, desc]) => `  <b>${esc(cmd.padEnd(18))}</b><span class="muted">${esc(desc)}</span>`).join('\n');

  const listPosts = () =>
    ctx.data.posts.map((p, i) => `  <i>${i + 1}.</i> ${esc(p.title)} <span class="muted">— ${esc(p.date)}</span>`).join('\n') ||
    '  <span class="muted">—</span>';

  const neofetch = () =>
    [
      `  <b>helder</b>@<b>${esc(location.hostname || 'heldergoncalves.io')}</b>`,
      '  ────────────────────────',
      `  <i>OS</i>        ${esc(ctx.data.strings.macName)} 26`,
      '  <i>Shell</i>     zsh',
      '  <i>Stack</i>     TypeScript · Python · Astro',
      `  <i>Modo</i>      ${ctx.mode === 'ios' ? 'iPhone' : 'Mac'}`,
      `  <i>Tema</i>      ${effectiveTheme()}`,
      `  <i>Escritos</i>  ${ctx.data.posts.length}`,
      '  <i>Frameworks</i> 0',
    ].join('\n');

  function run(raw) {
    const line = raw.trim();
    // A linha que se escreveu fica no registo com o prompt à frente,
    // como num terminal a sério — é assim que se relê o que se fez.
    print(`<span class="term-ps1">${esc(PS1)}</span>${esc(raw)}`);
    if (!line) return;
    history.push(line);
    cursor = history.length;
    const [cmd, ...rest] = line.split(/\s+/);
    const arg = rest.join(' ');
    const c = cmd.toLowerCase();

    if (['ajuda', 'help', '?'].includes(c)) return print(helpTable());
    if (['sobre', 'about', 'whoami'].includes(c)) {
      if (c === 'whoami') return print('  helder');
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
    // Comandos que num terminal existem e aqui não podiam faltar.
    if (c === 'pwd') return print('  /Users/helder');
    if (c === 'uname') return print(arg === '-a' ? '  Darwin heldergoncalves.io 26.0.0 arm64' : '  Darwin');
    if (c === 'neofetch') return print(neofetch());
    if (['limpar', 'clear'].includes(c)) {
      out.textContent = '';
      return;
    }
    if (c === 'sudo') return print('  <span class="err">' + esc(t.sudo) + '</span>');
    if (c === 'echo') return print('  ' + esc(arg));
    if (['sair', 'exit'].includes(c)) {
      ctx.run('close');
      return;
    }
    // A frase do zsh, tal como ele a escreve.
    print(`<span class="err">zsh: ${esc(t.unknown)} ${esc(cmd)}</span>`);
  }

  // ── As teclas ─────────────────────────────────────────────────────
  /** Tab completa o que houver. Um só resultado entra; vários listam-se,
      como num shell. */
  function completar() {
    const v = input.value;
    const iguais = COMANDOS.filter((c) => c.startsWith(v.toLowerCase()));
    if (!v || !iguais.length) return;
    if (iguais.length === 1) {
      input.value = iguais[0] + ' ';
      return;
    }
    print(`<span class="term-ps1">${esc(PS1)}</span>${esc(v)}`);
    print('  <span class="muted">' + iguais.map(esc).join('   ') + '</span>');
  }

  input.addEventListener('keydown', (ev) => {
    const v = input.value;
    const at = input.selectionStart ?? v.length;

    if (ev.key === 'Enter') {
      run(v);
      input.value = '';
    } else if (ev.key === 'Tab') {
      ev.preventDefault();
      completar();
    } else if (ev.key === 'ArrowUp') {
      ev.preventDefault();
      if (cursor > 0) input.value = history[--cursor] || '';
    } else if (ev.key === 'ArrowDown') {
      ev.preventDefault();
      cursor = Math.min(history.length, cursor + 1);
      input.value = history[cursor] || '';
    } else if (ev.ctrlKey) {
      // As teclas do readline. `Ctrl+C` não copia num terminal —
      // interrompe, e deixa a linha escrita com o `^C` ao lado.
      if (ev.key === 'c') {
        ev.preventDefault();
        print(`<span class="term-ps1">${esc(PS1)}</span>${esc(v)}<span class="muted">^C</span>`);
        input.value = '';
      } else if (ev.key === 'l') {
        ev.preventDefault();
        out.textContent = '';
      } else if (ev.key === 'a') {
        ev.preventDefault();
        input.setSelectionRange(0, 0);
      } else if (ev.key === 'e') {
        ev.preventDefault();
        input.setSelectionRange(v.length, v.length);
      } else if (ev.key === 'u') {
        ev.preventDefault();
        input.value = v.slice(at);
        input.setSelectionRange(0, 0);
      } else if (ev.key === 'k') {
        ev.preventDefault();
        input.value = v.slice(0, at);
      } else if (ev.key === 'w') {
        ev.preventDefault();
        const antes = v.slice(0, at).replace(/\s*\S+\s*$/, '');
        input.value = antes + v.slice(at);
        input.setSelectionRange(antes.length, antes.length);
      }
    }
    // Depois de a tecla ter feito o seu efeito — senão o bloco fica uma
    // letra atrás do que se escreveu.
    requestAnimationFrame(paint);
  });

  ['input', 'click', 'select', 'focus', 'blur'].forEach((e) => input.addEventListener(e, paint));

  // Clicar em qualquer sítio da janela põe o cursor na linha, como no
  // Terminal — excepto se se estiver a seleccionar texto para copiar,
  // ou a carregar numa ligação.
  term.addEventListener('mouseup', (ev) => {
    if (ev.target.closest('a')) return;
    if (String(window.getSelection())) return;
    input.focus();
  });

  paint();
  ctx.focusTerminal = () => setTimeout(() => input.focus(), 120);
}
