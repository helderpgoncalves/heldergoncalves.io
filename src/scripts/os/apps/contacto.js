import { forgetWho, requestToken, serverFeatures, whoAmI } from '../lib/session.js';
import { capturar } from '../lib/retomar.js';

// O envio passa pelo nosso servidor, que é quem tem a chave. Se o
// servidor não tiver email configurado, ou se falhar, abre-se o
// `mailto:` com tudo preenchido — a mensagem nunca se perde.
//
// Enviar pelo servidor pede sessão, e o "De" é o email da sessão, sem
// se poder editar: o servidor ignora o campo de qualquer maneira (ver
// routers/contact.py), e mostrá-lo editável seria prometer uma coisa
// que não acontece. Sem sessão o campo fica livre, porque aí o caminho
// é o `mailto:` — e um `mailto:` sai do cliente de correio da própria
// pessoa, que é prova suficiente de quem é.
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

  /** O "De" segue a sessão: preenchido e fechado para quem entrou,
      livre para quem não entrou (e vai sair pelo `mailto:`). */
  async function fillFrom() {
    const from = form.querySelector('#c-from');
    if (!from) return null;
    const email = await whoAmI();
    if (email) {
      from.value = email;
      from.readOnly = true;
    } else {
      from.readOnly = false;
    }
    return email;
  }

  /** Pede o token ao abrir a aplicação: o servidor recusa envios
      instantâneos, que é como os robôs trabalham. */
  async function prepare() {
    if (!asked) {
      asked = true;
      token = await requestToken();
      const features = serverFeatures();
      enabled = !!(features && features.contact);
    }
    // Sempre, não só da primeira vez: pode ter-se entrado ou saído
    // entretanto, e o campo tem de dizer a verdade.
    return fillFrom();
  }
  ctx.prepareContact = prepare;
  // Entrar ou sair muda quem assina — o campo tem de acompanhar mesmo
  // com a app já aberta à frente da pessoa.
  ctx.contacto = { refresh: fillFrom };

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
    const email = await prepare();
    const v = fields();
    if (v.message.length < 10) return say(t.short, 'warn');

    // Sem servidor de email, o `mailto:` continua a valer para toda a
    // gente — e aí é a pessoa que escreve o seu próprio endereço.
    if (!enabled || !token) {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.from)) return say(t.invalid, 'warn');
      return mailtoFallback(v, t.sendHint);
    }

    // O texto fica no formulário — depois de entrar, é só carregar em
    // enviar outra vez. Não se repete o envio sozinho: uma mensagem
    // que sai duas vezes é pior do que uma que espera um clique.
    if (!email) {
      capturar(ctx);
      ctx.entrar.open();
      return say(t.signInFirst, 'warn');
    }

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
      } else if (res.status === 401) {
        // A sessão caiu entre abrir a app e carregar em enviar.
        forgetWho();
        capturar(ctx);
        ctx.entrar.open();
        say(t.signInFirst, 'warn');
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
