import { requestToken, serverFeatures } from '../lib/session.js';

// O envio passa pelo nosso servidor, que é quem tem a chave. Se o
// servidor não tiver email configurado, ou se falhar, abre-se o
// `mailto:` com tudo preenchido — a mensagem nunca se perde.
export function initCompose(ctx) {
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
    token = await requestToken();
    const features = serverFeatures();
    enabled = !!(features && features.contact);
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
