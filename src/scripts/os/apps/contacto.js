import { amIOwner, forgetWho, postComToken, postJson, requestToken, serverFeatures, whoAmI } from '../lib/session.js';
import { capturar } from '../lib/retomar.js';

// A Mail tem duas caras, como as Mensagens.
//
//   Visitante com sessão: a folha de escrever de sempre. O envio passa
//         pelo nosso servidor, que é quem tem a chave; se o servidor não
//         tiver email configurado, ou se falhar, abre-se o `mailto:` com
//         tudo preenchido — a mensagem nunca se perde. O "De" é o email
//         da sessão, sem se poder editar: o servidor ignora o campo de
//         qualquer maneira (ver routers/contact.py), e mostrá-lo
//         editável seria prometer uma coisa que não acontece. Sem
//         sessão fica livre, porque aí o caminho é o `mailto:` — e esse
//         sai do cliente de correio da própria pessoa, que é prova
//         suficiente de quem é.
//
//   Dono: a conversa de quem lhe escreveu, e o compositor de resposta
//         com o botão que redige um rascunho. Escrever-se a si próprio
//         não é uma mensagem: `/api/contact` responde 403 `proprio` à
//         sessão dele, e deste lado a folha nem aparece.
//
// A lista de quem escreveu é o outro metade e vive ao lado, em
// contacto-inbox.js — as duas falam por `ctx.mailThread` e
// `ctx.mailInbox`, nunca por importação directa (ver
// .claude/rules/cliente.md). A forma está em styles/os/mail.css.
export function initCompose(ctx) {
  const el = ctx.contentNode('contacto');
  if (!el) return;
  const form = el.querySelector('[data-compose]');
  const hint = el.querySelector('[data-compose-hint]');
  const t = ctx.data.strings.contact;
  const w = ctx.data.strings.mail;

  // A metade do dono. Num visitante estes nós existem na mesma, mas
  // ficam escondidos e nunca recebem nada.
  const thread = el.querySelector('[data-mail-thread]');
  const head = el.querySelector('[data-mail-head]');
  const scroll = el.querySelector('[data-mail-scroll]');
  const pick = el.querySelector('[data-mail-pick]');
  const avatar = el.querySelector('[data-mail-avatar]');
  const name = el.querySelector('[data-mail-name]');
  const to = el.querySelector('[data-mail-to]');
  const subject = el.querySelector('[data-mail-subject]');
  const list = el.querySelector('[data-mail-messages]');
  const reply = el.querySelector('[data-mail-reply]');
  const replyText = el.querySelector('[data-mail-text]');
  const replyHint = el.querySelector('[data-mail-hint]');
  const draftBtn = el.querySelector('[data-mail-draft]');
  const back = el.querySelector('[data-mail-back]');

  let token = null;
  let enabled = false;
  let asked = false;
  let busy = false;
  let owner = false;
  let live = false;
  let open = null; // a conversa aberta: { conversation, email, subject }

  const say = (text, tone) => {
    if (!hint) return;
    hint.textContent = text;
    hint.dataset.tone = tone || '';
  };
  const sayReply = (text, tone) => {
    if (!replyHint) return;
    replyHint.textContent = text || '';
    replyHint.dataset.tone = tone || '';
  };

  // ── Datas ─────────────────────────────────────────────────────────
  // O servidor manda sempre o instante ISO em UTC; o fuso é de quem
  // está a ver. Um sítio só a formatar, para a lista e a conversa
  // dizerem o mesmo.
  const timeFmt = new Intl.DateTimeFormat(ctx.data.intlLocale, { hour: '2-digit', minute: '2-digit' });
  const dayFmt = new Intl.DateTimeFormat(ctx.data.intlLocale, { day: 'numeric', month: 'short' });
  const longFmt = new Intl.DateTimeFormat(ctx.data.intlLocale, {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
  const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

  /** O que a linha da lista mostra à direita: a hora se foi hoje,
      senão o dia — como na Mail da Apple. */
  function relativeWhen(iso) {
    if (!iso) return '';
    const d = new Date(iso);
    const dias = Math.round((startOfDay(new Date()) - startOfDay(d)) / 86400000);
    if (dias <= 0) return timeFmt.format(d);
    if (dias === 1) return w.yesterday;
    return dayFmt.format(d);
  }

  /** Rótulo → duas letras, como o círculo de um contacto sem foto. */
  function initials(text) {
    const limpo = String(text || '?').replace(/^[a-z]+:/, '').trim();
    return (limpo.slice(0, 2) || '?').toUpperCase();
  }

  // ── As três caras ─────────────────────────────────────────────────
  // A do visitante, e as duas do dono: sem ninguém escolhido, e a ler
  // alguém. O painel da conversa (`thread`) fica sempre montado do lado
  // do dono — é o que está lá dentro que aparece e desaparece. Escondê-
  // -lo por `hidden` matava a entrada a deslizar no ecrã estreito.
  /** O visitante: a folha de escrever, e mais nada. */
  function showCompose() {
    el.classList.remove('owner', 'thread-open');
    form.hidden = false;
    if (thread) thread.hidden = true;
  }

  /** O dono, ainda sem escolher ninguém. */
  function pickNothing() {
    el.classList.remove('thread-open');
    open = null;
    form.hidden = true;
    if (thread) thread.hidden = false;
    if (pick) pick.hidden = false;
    if (head) head.hidden = true;
    if (scroll) scroll.hidden = true;
    if (reply) reply.hidden = true;
  }

  /** O dono a ler o que alguém lhe escreveu. `row` é a linha da lista
      (quem é), `messages` a conversa toda, mais antigas primeiro. */
  function showThread(row, messages) {
    open = row;
    el.classList.add('thread-open');
    form.hidden = true;
    if (!thread) return;
    thread.hidden = false;
    if (pick) pick.hidden = true;
    if (head) head.hidden = false;
    if (scroll) scroll.hidden = false;
    if (reply) reply.hidden = false;

    const quem = (row && row.email) || '';
    avatar.textContent = initials(quem);
    name.textContent = quem;
    to.textContent = w.to + ' ' + ctx.data.site.email;
    const ultima = messages[messages.length - 1] || {};
    subject.textContent = ultima.subject || w.noSubject;

    list.innerHTML = '';
    for (const msg of messages) {
      const bloco = document.createElement('article');
      const minha = msg.role === 'dono';
      bloco.className = 'mail-msg' + (minha ? ' mine' : '');
      const topo = document.createElement('p');
      topo.className = 'mail-msg-top';
      const autor = document.createElement('b');
      autor.textContent = minha ? w.me : quem;
      const quando = document.createElement('span');
      quando.textContent = msg.at ? longFmt.format(new Date(msg.at)) : '';
      topo.append(autor, quando);
      const corpo = document.createElement('p');
      corpo.className = 'mail-msg-body';
      corpo.textContent = msg.text || '';
      bloco.append(topo, corpo);
      list.appendChild(bloco);
    }

    if (replyText) replyText.value = '';
    reply.classList.remove('ready');
    sayReply(live ? '' : w.draftOff, live ? '' : 'warn');
  }

  function setOwner(is) {
    owner = is;
    el.classList.toggle('owner', is);
    if (is) pickNothing();
    else showCompose();
  }

  // ── A folha de escrever (visitante) ───────────────────────────────
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
      // O rascunho usa o mesmo modelo das Mensagens: sem ele ligado, o
      // compositor continua a servir — escreve-se a resposta à mão.
      live = !!(features && features.chat);
    }
    // Quem está sentado ao teclado pode ter mudado (entrou, saiu) desde
    // a última vez que a app abriu.
    const is = await amIOwner();
    if (is !== owner) setOwner(is);
    if (is && ctx.mailInbox) await ctx.mailInbox.load();
    // Sair da sessão de dono leva o badge com ela: o número era do que
    // ele tinha por ler, e sem sessão dele não há caixa de entrada
    // nenhuma para contar.
    if (!is && ctx.badges) ctx.badges.set('contacto', 0);
    // Sempre, não só da primeira vez: o campo tem de dizer a verdade.
    if (!is) await fillFrom();
    return is;
  }
  ctx.prepareContact = prepare;
  // Entrar ou sair muda quem assina, e muda que cara a app tem — tem de
  // acompanhar mesmo com a app já aberta à frente da pessoa.
  ctx.contacto = { refresh: prepare };

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
      // `postComToken` pede o token e, se o servidor o recusar por já
      // não o reconhecer (reiniciou entretanto), pede outro e tenta uma
      // vez mais — ver lib/session.js.
      const res = await postComToken('/api/contact', v);
      if (res.ok) {
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

  // ── Responder (dono) ──────────────────────────────────────────────
  /** O rascunho entra no campo para ser EDITADO. Nunca sai sozinho:
      quem carrega em enviar é o Hélder, depois de o ler. */
  async function redigir() {
    if (!open || reply.classList.contains('drafting')) return;
    reply.classList.add('drafting');
    sayReply(w.drafting);
    try {
      const res = await postJson('/api/mail/rascunho', { conversa: open.conversation });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data || !data.ok || typeof data.text !== 'string') throw new Error('falhou');
      replyText.value = data.text;
      reply.classList.toggle('ready', data.text.trim().length > 0);
      sayReply(w.draftDone, 'ok');
    } catch (_) {
      // Sem rascunho o compositor continua a servir: escreve-se à mão.
      sayReply(w.draftFailed, 'warn');
    }
    reply.classList.remove('drafting');
  }

  async function enviarResposta() {
    if (!open || busy) return;
    const texto = (replyText.value || '').trim();
    if (texto.length < 10) return sayReply(w.short, 'warn');
    busy = true;
    sayReply(w.sending);
    try {
      const res = await postJson('/api/mail/responder', {
        conversa: open.conversation,
        subject: open.subject || '',
        message: texto,
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data || !data.ok) throw new Error('falhou');
      replyText.value = '';
      reply.classList.remove('ready');
      sayReply(w.sent, 'ok');
      ctx.notify(w.sent);
      // A resposta passa a fazer parte da conversa: recarregar é o que
      // a põe no ecrã sem a inventar aqui a partir do que se escreveu.
      if (ctx.mailInbox) await ctx.mailInbox.reopen();
    } catch (_) {
      sayReply(w.failed, 'warn');
    }
    busy = false;
  }

  if (draftBtn) draftBtn.addEventListener('click', redigir);
  if (reply)
    reply.addEventListener('submit', (ev) => {
      ev.preventDefault();
      enviarResposta();
    });
  if (replyText)
    replyText.addEventListener('input', () => reply.classList.toggle('ready', replyText.value.trim().length > 0));
  // Voltar: só existe quando a lista e a conversa são dois ecrãs.
  if (back)
    back.addEventListener('click', () => {
      pickNothing();
      if (ctx.mailInbox) ctx.mailInbox.closed();
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

  // O que a lista do dono precisa desta metade.
  ctx.mailThread = { showThread, pickNothing, initials, relativeWhen };
}
