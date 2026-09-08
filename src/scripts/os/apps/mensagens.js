import { esc } from '../lib/dom.js';
import { amIOwner, requestToken, serverFeatures } from '../lib/session.js';

// Conversa a sério quando o servidor tem uma chave de modelo, e as
// respostas guardadas quando não tem. O texto do modelo entra sempre
// como texto (textContent), nunca como HTML.
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
  const t = ctx.data.strings.chat;
  const canned = [...el.querySelectorAll('.chat-canned')];
  const opening = log.innerHTML;
  const openingTitle = title ? title.textContent : '';
  const openingSubtitle = subtitle ? subtitle.textContent : '';
  canned.forEach((c) => c.remove());

  // ── A lista de conversas, só para o dono ────────────────────────────
  // O backend já recusa /api/mensagens a quem não é o dono — isto é só
  // a camada visual: sem sessão de dono, a barra nem chega a pedir a
  // lista, e a app funciona exactamente como antes (a conversa única).
  const sidebar = el.querySelector('[data-msg-sidebar]');
  const convList = el.querySelector('[data-msg-conv-list]');
  const convEmpty = el.querySelector('[data-msg-conv-empty]');
  const search = el.querySelector('[data-msg-search]');
  let conversations = [];
  let ownConversationId = null;

  const weekdayFmt = new Intl.DateTimeFormat(ctx.data.intlLocale, { weekday: 'long' });
  const timeFmt = new Intl.DateTimeFormat(ctx.data.intlLocale, { hour: '2-digit', minute: '2-digit' });
  const dayFmt = new Intl.DateTimeFormat(ctx.data.intlLocale, { day: 'numeric', month: 'short' });
  function relativeWhen(iso) {
    if (!iso) return '';
    const d = new Date(iso);
    const startOfDay = (date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const days = Math.round((startOfDay(new Date()) - startOfDay(d)) / (24 * 60 * 60 * 1000));
    if (days <= 0) return timeFmt.format(d);
    if (days === 1) return t.yesterday || weekdayFmt.format(d);
    if (days < 7) return weekdayFmt.format(d);
    return dayFmt.format(d);
  }

  function initials(text) {
    return (text || '?').slice(0, 2).toUpperCase();
  }

  function renderConversations() {
    const q = (search && search.value.trim().toLowerCase()) || '';
    const rows = conversations.filter((c) => !q || (c.email || c.conversation).toLowerCase().includes(q));
    convEmpty.hidden = rows.length > 0;
    convList.innerHTML = rows
      .map((c) => {
        const label = c.email || c.conversation.replace(/^visitante:/, '');
        const active = c.conversation === ownConversationId;
        return (
          '<li>' +
          '<button type="button" data-conv="' + esc(c.conversation) + '" class="msg-conv-row flex w-full flex-col gap-0.5 border-b-[0.5px] border-(--line) px-3.5 py-2.5 text-left' +
          (active ? ' bg-(--accent) text-white' : ' text-(--ink) hover:bg-(--surface-3)') + '">' +
          '<span class="flex items-center gap-2">' +
          '<span class="grid h-7 w-7 flex-none place-items-center rounded-full bg-(--surface-3) text-[11px] font-semibold' + (active ? ' bg-white/25 text-white' : ' text-(--ink-2)') + '">' + esc(initials(label)) + '</span>' +
          '<strong class="min-w-0 flex-1 truncate text-[13px] font-semibold">' + esc(label) + '</strong>' +
          '<span class="flex-none text-[11px]' + (active ? ' text-white/80' : ' text-(--ink-3)') + '">' + esc(relativeWhen(c.last)) + '</span>' +
          '</span>' +
          '<span class="truncate pl-9 text-[12px]' + (active ? ' text-white/80' : ' text-(--ink-3)') + '">' + esc(String(c.turns)) + ' ' + esc(t.turns || '') + '</span>' +
          '</button></li>'
        );
      })
      .join('');
  }

  async function openConversation(convId) {
    ownConversationId = convId;
    renderConversations();
    const found = conversations.find((c) => c.conversation === convId);
    if (title) title.textContent = (found && (found.email || found.conversation)) || openingTitle;
    if (subtitle) subtitle.textContent = t.withAssistant || openingSubtitle;
    try {
      const res = await fetch('/api/mensagens/' + encodeURIComponent(convId), { headers: { Accept: 'application/json' } });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data || !data.ok) return;
      log.innerHTML = '';
      // Aqui é o dono a ler: quem fala é o visitante ("them"), quem
      // responde é o assistente em nome do Hélder ("me") — o inverso
      // da conversa normal, onde quem está a ver é o próprio visitante.
      (data.turns || []).forEach((turn) => bubble(turn.role === 'assistant' ? 'me' : 'them', turn.text));
    } catch (_) {
      // A conversa fica com o que já lá estava — sem partir a vista.
    }
  }

  async function loadConversations() {
    try {
      const res = await fetch('/api/mensagens', { headers: { Accept: 'application/json' } });
      if (!res.ok) return;
      const data = await res.json().catch(() => null);
      if (!data || !data.ok) return;
      conversations = data.conversations || [];
      renderConversations();
    } catch (_) {
      // Sem lista, a app continua a funcionar como conversa única.
    }
  }

  async function prepareSidebar() {
    if (!sidebar) return;
    const owner = await amIOwner();
    if (!owner) return;
    sidebar.hidden = false;
    sidebar.removeAttribute('aria-hidden');
    await loadConversations();
  }

  if (search) search.addEventListener('input', renderConversations);
  if (convList)
    convList.addEventListener('click', (ev) => {
      const btn = ev.target.closest('[data-conv]');
      if (btn) openConversation(btn.dataset.conv);
    });

  let token = null;
  let live = false;
  let asked = false;
  let busy = false;
  let history = [];

  async function prepare() {
    if (!asked) {
      asked = true;
      token = await requestToken();
      const features = serverFeatures();
      live = !!(features && features.chat);
      if (note) note.textContent = live && token ? t.ai : t.aiOff;
    }
    // A sidebar (só do dono) pede sempre de novo ao reabrir: pode ter
    // chegado gente nova a falar com o assistente desde a última vez.
    await prepareSidebar();
  }
  ctx.prepareChat = prepare;

  const scroll = () => (log.scrollTop = log.scrollHeight);

  const BUBBLE_BASE = 'bubble max-w-[78%] rounded-[19px] px-3.5 py-2.25 text-[15px] leading-[1.42] [animation:bubble-in_0.3s_var(--ease-pop)]';
  const BUBBLE_SIDE = {
    them: 'them self-start rounded-bl-[6px] bg-(--surface-3) text-(--ink)',
    me: "me self-end rounded-br-[6px] bg-(--green) text-white [data-theme='dark']:bg-[#30d158] [data-theme='dark']:text-[#06240f]",
  };

  function bubble(side, text) {
    const p = document.createElement('p');
    p.className = BUBBLE_BASE + ' ' + BUBBLE_SIDE[side];
    p.textContent = text || '';
    log.appendChild(p);
    scroll();
    return p;
  }

  function typing() {
    const p = document.createElement('p');
    p.className = BUBBLE_BASE + ' ' + BUBBLE_SIDE.them + ' typing flex gap-1 px-3.5 py-3 [&_i]:h-1.75 [&_i]:w-1.75 [&_i]:rounded-full [&_i]:bg-(--ink-3) [&_i]:[animation:dot_1.1s_infinite] [&_i:nth-child(2)]:[animation-delay:0.15s] [&_i:nth-child(3)]:[animation-delay:0.3s]';
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
    // Sem CSS.escape: comparar é mais simples e funciona em todo o lado.
    const chip = [...suggest.querySelectorAll('[data-ask]')].find((b) => b.dataset.ask === message);
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
