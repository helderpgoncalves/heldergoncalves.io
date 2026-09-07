import { requestToken, serverFeatures } from '../lib/session.js';

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
    token = await requestToken();
    const features = serverFeatures();
    live = !!(features && features.chat);
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
