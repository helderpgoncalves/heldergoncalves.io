// ─────────────────────────────────────────────────────────────────────
// Subscrever o blog.
//
// O formulário não põe ninguém na lista: pede ao servidor que envie um
// email com uma ligação, e é a ligação que inscreve. Por isso a
// resposta em caso de sucesso não é "subscrito" — é "vai ao teu email".
//
// Se o servidor não tiver o envio ligado, o campo desaparece em vez de
// ficar ali a prometer uma coisa que não acontece.
// ─────────────────────────────────────────────────────────────────────
import { requestToken, serverFeatures } from '../lib/session.js';

export function initSubscribe(ctx) {
  const el = ctx.contentNode('escritos');
  if (!el) return;
  const form = el.querySelector('[data-subscribe]');
  if (!form) return;

  const input = form.querySelector('[data-subscribe-email]');
  const trap = form.querySelector('[data-subscribe-trap]');
  const note = form.querySelector('[data-subscribe-note]');
  const t = ctx.data.strings.escritos;
  const resting = note ? note.textContent : '';

  let asked = false;
  let busy = false;

  const say = (text, tone) => {
    if (!note) return;
    note.textContent = text;
    note.dataset.tone = tone || '';
  };

  /** Pergunta ao servidor o que está ligado, uma vez, ao abrir a app. */
  async function prepare() {
    if (asked) return;
    asked = true;
    await requestToken();
    const features = serverFeatures();
    if (features && !features.subscribe) form.hidden = true;
  }
  ctx.prepareSubscribe = prepare;

  form.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    if (busy) return;

    const email = (input.value || '').trim();
    if (!email || email.indexOf('@') < 1) return say(t.subscribeBad, 'bad');

    busy = true;
    form.dataset.busy = '1';
    say(t.subscribeSending);

    // Um token novo por envio: o servidor só aceita cada um uma vez.
    const token = await requestToken();
    const features = serverFeatures();
    if (!token || (features && !features.subscribe)) {
      busy = false;
      form.dataset.busy = '';
      return say(t.subscribeOff, 'bad');
    }

    try {
      const res = await fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          lang: ctx.data.lang,
          token,
          company: trap ? trap.value : '',
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.ok) {
        form.dataset.done = '1';
        input.value = '';
        say(t.subscribeSent, 'good');
      } else {
        say(data.error === 'email' ? t.subscribeBad : t.subscribeFail, 'bad');
      }
    } catch (_) {
      say(t.subscribeFail, 'bad');
    }
    busy = false;
    form.dataset.busy = '';
  });

  // Ao voltar a escrever, o aviso apaga-se: um erro antigo em cima de um
  // campo já corrigido só confunde.
  input.addEventListener('input', () => {
    if (note && note.dataset.tone === 'bad') say(resting);
  });
}
