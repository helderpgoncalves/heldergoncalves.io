import { amIOwner, forgetWho, requestToken, serverFeatures, whoAmI } from '../lib/session.js';
import { capturar } from '../lib/retomar.js';

// A conversa das Mensagens: as bolhas, o que se escreve, e o que o
// assistente responde. A lista de conversas do dono é outro assunto e
// vive ao lado, em mensagens-inbox.js — as duas falam através de
// `ctx.mensagens` e `ctx.inbox`, nunca por importação directa (ver
// .claude/rules/cliente.md). A forma está em styles/os/mensagens.css.
//
// Falar pede sessão: a conversa fica guardada e é o Hélder que a vai
// ler, e isso só vale se souber de quem é. E o dono não fala consigo
// próprio — do lado dele isto é uma caixa de entrada, não um chat.
export function initChat(ctx) {
  const el = ctx.contentNode('mensagens');
  if (!el) return;
  const log = el.querySelector('[data-chat-log]');
  const suggest = el.querySelector('[data-chat-suggest]');
  const form = el.querySelector('[data-chat-form]');
  const input = el.querySelector('[data-chat-input]');
  const note = el.querySelector('[data-chat-note]');
  const title = el.querySelector('[data-chat-title]');
  const subtitle = el.querySelector('[data-chat-subtitle]');
  const avatar = el.querySelector('[data-chat-avatar]');
  const ownerBar = el.querySelector('[data-msg-owner-bar]');
  const reply = el.querySelector('[data-msg-reply]');
  const pick = el.querySelector('[data-msg-pick]');
  const reset = el.querySelector('[data-chat-reset]');
  const t = ctx.data.strings.chat;
  const canned = [...el.querySelectorAll('.chat-canned')];
  const opening = log.innerHTML;
  const openingTitle = title.textContent;
  const openingSubtitle = subtitle.textContent;
  const openingChips = [...suggest.querySelectorAll('[data-ask]')].map((b) => b.dataset.ask);

  let token = null;
  let live = false;
  let asked = false;
  let busy = false;
  let owner = false;
  let history = [];

  // ── Datas ─────────────────────────────────────────────────────────
  // Um só sítio a formatar horas, para a lista e a conversa dizerem o
  // mesmo. O servidor manda sempre o instante ISO em UTC; o fuso é de
  // quem está a ver.
  const weekdayFmt = new Intl.DateTimeFormat(ctx.data.intlLocale, { weekday: 'long' });
  const timeFmt = new Intl.DateTimeFormat(ctx.data.intlLocale, { hour: '2-digit', minute: '2-digit' });
  const dayFmt = new Intl.DateTimeFormat(ctx.data.intlLocale, { day: 'numeric', month: 'short' });
  const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

  function daysAgo(date) {
    return Math.round((startOfDay(new Date()) - startOfDay(date)) / 86400000);
  }
  /** O nome do dia: "Hoje", "Ontem", o dia da semana, ou a data. */
  function dayOf(date) {
    const days = daysAgo(date);
    if (days <= 0) return ctx.data.strings.today;
    if (days === 1) return t.yesterday;
    if (days < 7) return weekdayFmt.format(date);
    return dayFmt.format(date);
  }
  const timeOf = (date) => timeFmt.format(date);
  /** O que uma linha da lista mostra à direita: a hora se foi hoje,
      senão o nome do dia — como na lista de conversas da Apple. */
  function relativeWhen(iso) {
    if (!iso) return '';
    const d = new Date(iso);
    return daysAgo(d) <= 0 ? timeOf(d) : dayOf(d);
  }

  /** Rótulo → duas letras, como o círculo de um contacto sem foto. */
  function initials(text) {
    const clean = String(text || '?').replace(/^[a-z]+:/, '').trim();
    return (clean.slice(0, 2) || '?').toUpperCase();
  }

  // ── As bolhas ─────────────────────────────────────────────────────
  const scroll = () => (log.scrollTop = log.scrollHeight);

  /** Uma bolha nova, já agrupada com a anterior se for do mesmo lado:
      as seguidas colam-se, e só a última do grupo leva cauda. */
  function bubble(side, text) {
    const previous = log.lastElementChild;
    const sameSide = previous && previous.classList.contains('msg-row') && previous.classList.contains(side);
    if (sameSide) {
      const before = previous.querySelector('.msg-b');
      if (before) before.classList.remove('tail');
    }
    const row = document.createElement('div');
    row.className = 'msg-row ' + side + (sameSide ? ' same' : '');
    const p = document.createElement('p');
    p.className = 'msg-b ' + side + ' tail' + (sameSide ? '' : ' grp-first');
    p.textContent = text || '';
    row.appendChild(p);
    log.appendChild(row);
    scroll();
    return p;
  }

  function typing() {
    const p = bubble('them', '');
    p.classList.add('typing');
    p.setAttribute('aria-label', t.typing);
    p.innerHTML = '<i></i><i></i><i></i>';
    scroll();
    return p.parentElement;
  }

  /** O carimbo ao meio do registo: "**Ontem** 21:04". */
  function stamp(date) {
    const p = document.createElement('p');
    p.className = 'msg-stamp';
    const b = document.createElement('b');
    b.textContent = dayOf(date);
    p.append(b, ' ' + timeOf(date));
    log.appendChild(p);
  }

  // ── As duas caras da app ──────────────────────────────────────────
  function showCompose(on) {
    form.hidden = !on;
    suggest.hidden = !on;
    note.hidden = !on;
    ownerBar.hidden = on;
  }

  /** A conversa com o assistente — o que um visitante vê sempre. */
  function showAssistant() {
    el.classList.remove('thread-open');
    log.hidden = false;
    pick.hidden = true;
    reply.hidden = true;
    log.innerHTML = opening;
    title.textContent = openingTitle;
    subtitle.textContent = openingSubtitle;
    avatar.textContent = 'H';
    history = [];
    suggest.innerHTML = '';
    for (const q of openingChips) {
      const b = document.createElement('button');
      b.type = 'button';
      b.dataset.ask = q;
      b.textContent = q;
      suggest.appendChild(b);
    }
    const mail = document.createElement('button');
    mail.type = 'button';
    mail.dataset.askMail = '1';
    mail.textContent = ctx.data.site.email;
    suggest.appendChild(mail);
    showCompose(true);
  }

  /** O dono, ainda sem escolher ninguém. */
  function pickNothing() {
    el.classList.remove('thread-open');
    log.hidden = true;
    pick.hidden = false;
    reply.hidden = true;
    showCompose(false);
    ownerBar.hidden = true;
    title.textContent = openingTitle;
    subtitle.textContent = t.withAssistant;
    avatar.textContent = 'H';
  }

  /** O dono a ler a conversa de alguém. Quem fala é o visitante
      ("them"), quem responde é o assistente em nome do Hélder ("me")
      — o inverso da conversa normal, onde quem vê é o visitante. */
  function showTranscript(label, email, turns) {
    el.classList.add('thread-open');
    log.hidden = false;
    pick.hidden = true;
    showCompose(false);
    ownerBar.hidden = false;
    title.textContent = label;
    subtitle.textContent = t.withAssistant;
    avatar.textContent = initials(label);
    reply.hidden = !email;
    if (email) reply.href = 'mailto:' + email;
    log.innerHTML = '';
    let day = '';
    for (const turn of turns || []) {
      const when = turn.at ? new Date(turn.at) : null;
      if (when && when.toDateString() !== day) {
        day = when.toDateString();
        stamp(when);
      }
      bubble(turn.role === 'assistant' ? 'me' : 'them', turn.text);
    }
    scroll();
  }

  function setOwner(is) {
    owner = is;
    el.classList.toggle('owner', is);
    if (is) pickNothing();
    else showAssistant();
  }

  // ── Preparar ──────────────────────────────────────────────────────
  async function prepare() {
    if (!asked) {
      asked = true;
      token = await requestToken();
      const features = serverFeatures();
      live = !!(features && features.chat);
      if (note) note.textContent = live && token ? t.ai : t.aiOff;
    }
    // Quem está sentado ao teclado pode ter mudado (entrou, saiu)
    // desde a última vez que a app abriu.
    const is = await amIOwner();
    if (is !== owner) setOwner(is);
    if (is && ctx.inbox) await ctx.inbox.load();
    return is;
  }
  ctx.prepareChat = prepare;

  /** Sem modelo: procura a resposta guardada mais próxima. */
  function cannedFor(text) {
    const q = text.toLowerCase();
    const textOf = (c) => c.querySelector('span').textContent;
    const exact = canned.find((c) => c.dataset.q.toLowerCase() === q);
    if (exact) return textOf(exact);
    const words = q.split(/\s+/).filter((w) => w.length > 3);
    let best = null;
    let bestScore = 0;
    for (const c of canned) {
      const hay = (c.dataset.q + ' ' + textOf(c)).toLowerCase();
      const score = words.filter((w) => hay.includes(w)).length;
      if (score > bestScore) {
        bestScore = score;
        best = c;
      }
    }
    return best && bestScore >= 2 ? textOf(best) : t.unknown;
  }

  /** Escreve a resposta letra a letra. O texto chega inteiro do
      servidor — mais barato e mais fiável do que streaming — e é aqui
      que ganha o ritmo de quem está a escrever do outro lado. */
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
    if (res.status === 401) throw new Error('sessao');
    if (res.status === 403) throw new Error('proprio');
    const data = await res.json().catch(() => null);
    if (!res.ok || !data || !data.ok || typeof data.text !== 'string') throw new Error('upstream');
    return data.text;
  }

  async function ask(text) {
    const message = String(text || '').trim().slice(0, 600);
    if (!message || busy) return;

    // Antes de escrever a bolha: se isto não vai a lado nenhum, é
    // melhor o campo ficar como estava do que ver o que se escreveu
    // pendurado numa conversa que não avançou.
    await prepare();
    if (owner) {
      if (note) note.textContent = t.ownerCannot;
      return;
    }
    if (!(await whoAmI())) {
      capturar(ctx);
      ctx.entrar.open();
      if (note) note.textContent = t.signInFirst;
      return;
    }

    busy = true;
    if (input) {
      input.value = '';
      form.classList.remove('ready');
    }
    bubble('me', message);
    // Sem CSS.escape: comparar é mais simples e funciona em todo o lado.
    const chip = [...suggest.querySelectorAll('[data-ask]')].find((b) => b.dataset.ask === message);
    if (chip) chip.remove();

    const dots = typing();

    if (!live || !token) {
      const answer = cannedFor(message);
      setTimeout(() => {
        dots.remove();
        bubble('them', answer);
        busy = false;
      }, 550 + Math.random() * 350);
      return;
    }

    history.push({ role: 'user', content: message });
    history = history.slice(-8);
    try {
      const answer = await talk();
      dots.remove();
      await typeOut(bubble('them', ''), answer);
      history.push({ role: 'assistant', content: answer });
    } catch (err) {
      const reason = err && err.message;
      if (dots.isConnected) dots.remove();
      if (reason === 'sessao') {
        forgetWho();
        capturar(ctx);
        ctx.entrar.open();
      }
      bubble(
        'them',
        reason === 'limite' ? t.limit : reason === 'sessao' ? t.signInFirst : reason === 'proprio' ? t.ownerCannot : t.error
      );
      history.pop();
    }
    busy = false;
  }

  // ── Ligações ──────────────────────────────────────────────────────
  suggest.addEventListener('click', (ev) => {
    const b = ev.target.closest('[data-ask]');
    if (b) return ask(b.dataset.ask);
    if (ev.target.closest('[data-ask-mail]')) location.href = 'mailto:' + ctx.data.site.email;
  });

  form.addEventListener('submit', (ev) => {
    ev.preventDefault();
    ask(input && input.value);
  });
  if (input) input.addEventListener('input', () => form.classList.toggle('ready', input.value.trim().length > 0));
  if (reset) reset.addEventListener('click', () => (owner ? pickNothing() : showAssistant()));

  // O que a lista do dono precisa desta metade.
  ctx.mensagens = { showTranscript, pickNothing, initials, relativeWhen, refresh: prepare };
}
