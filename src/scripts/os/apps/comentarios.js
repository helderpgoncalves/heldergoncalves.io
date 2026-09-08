// ─────────────────────────────────────────────────────────────────────
// Comentários e reações, por baixo de cada escrito.
//
// A secção vive dentro de `[data-post-body]`, que `escritos.js` troca
// inteira a cada navegação — por isso não se liga uma vez ao arranque
// como as outras apps: `escritos.js` chama `ctx.comentarios.onShow(slug)`
// depois de cada troca, através do objecto partilhado, nunca por
// importação directa (ver .claude/rules/cliente.md). Os cliques e o
// envio do formulário ligam-se por delegação ao nó da app, que esse
// sim é estável — por isso não é preciso religar nada.
// ─────────────────────────────────────────────────────────────────────
import { esc } from '../lib/dom.js';
import { requestToken, whoAmI } from '../lib/session.js';

const post = (path, body) =>
  fetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(body),
  });

export function initComentarios(ctx) {
  const el = ctx.contentNode('escritos');
  if (!el) return;
  const t = ctx.data.strings.escritos.comments;

  let currentSlug = null;

  const section = () => el.querySelector('[data-comments]');

  function renderList(sec, comments) {
    const list = sec.querySelector('[data-comments-list]');
    const empty = sec.querySelector('[data-comments-empty]');
    if (!list) return;
    list.innerHTML = comments
      .map(
        (c) =>
          '<li class="comment"><p class="comment-head">' + esc(c.name) + '</p>' +
          '<p class="comment-body">' + esc(c.body) + '</p></li>'
      )
      .join('');
    if (empty) empty.hidden = comments.length > 0;
  }

  function renderReactions(sec, counts, mine) {
    sec.querySelectorAll('[data-reaction]').forEach((btn) => {
      const kind = btn.dataset.reaction;
      const countEl = btn.querySelector('[data-reaction-count]');
      if (countEl) countEl.textContent = String((counts && counts[kind]) || 0);
      btn.setAttribute('aria-pressed', String(Boolean(mine && mine.includes(kind))));
    });
  }

  /** Comentar e reagir pedem sessão — sem ela, mostra-se o convite a
   * entrar em vez do formulário, e os botões de reação abrem o mesmo
   * ecrã em vez de tentar o pedido. */
  async function prepareForm(sec) {
    const form = sec.querySelector('[data-comments-form]');
    const signin = sec.querySelector('[data-comments-signin]');
    const email = await whoAmI();
    if (form) form.hidden = !email;
    if (signin) signin.hidden = Boolean(email);
  }

  async function load(slug) {
    const sec = section();
    if (!sec) return;
    prepareForm(sec);
    try {
      const res = await fetch('/api/comentarios?post=' + encodeURIComponent(slug), { headers: { Accept: 'application/json' } });
      const data = await res.json().catch(() => null);
      if (!data || !data.ok) return;
      renderList(sec, data.comments || []);
      renderReactions(sec, data.reactions || {}, data.mine || []);
    } catch (_) {
      /* os comentários são um extra — uma falha aqui não estraga o escrito */
    }
  }

  function onShow(slug) {
    currentSlug = slug;
    load(slug);
  }
  ctx.comentarios = {
    onShow,
    refresh: () => currentSlug && prepareForm(section()),
  };

  // O escrito já podia vir servido no arranque — carrega os comentários
  // dele sem esperar por nenhuma navegação.
  const seeded = section();
  if (seeded) onShow(seeded.dataset.comments);

  el.addEventListener('click', async (ev) => {
    const signIn = ev.target.closest('[data-action="entrar"]');
    if (signIn) {
      ctx.run('entrar');
      return;
    }

    const btn = ev.target.closest('[data-reaction]');
    if (!btn || !currentSlug) return;
    if (!(await whoAmI())) {
      ctx.run('entrar');
      return;
    }
    const kind = btn.dataset.reaction;
    post('/api/comentarios/reagir', { post: currentSlug, kind })
      .then((res) => res.json())
      .then((data) => {
        if (!data || !data.ok) return;
        const sec = section();
        if (!sec) return;
        btn.setAttribute('aria-pressed', String(data.active));
        sec.querySelectorAll('[data-reaction]').forEach((b) => {
          const countEl = b.querySelector('[data-reaction-count]');
          if (countEl) countEl.textContent = String((data.reactions && data.reactions[b.dataset.reaction]) || 0);
        });
      })
      .catch(() => {});
  });

  el.addEventListener('submit', async (ev) => {
    const form = ev.target.closest('[data-comments-form]');
    if (!form || !currentSlug) return;
    ev.preventDefault();

    const hint = form.querySelector('[data-comments-hint]');
    const say = (text) => {
      if (hint) hint.textContent = text || '';
    };
    const body = (form.querySelector('[data-comments-body]') || {}).value || '';
    if (body.trim().length < 3) return say(t.short);

    form.dataset.busy = '1';
    say(t.sending);
    const token = await requestToken();
    if (!token) {
      form.dataset.busy = '';
      return say(t.fail);
    }

    try {
      const res = await post('/api/comentarios', {
        post: currentSlug,
        name: (form.querySelector('[data-comments-name]') || {}).value || '',
        email: (form.querySelector('[data-comments-email]') || {}).value || '',
        body,
        lang: ctx.data.lang,
        token,
        company: (form.querySelector('[data-comments-trap]') || {}).value || '',
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.ok) {
        form.reset();
        say(t.sent);
        load(currentSlug);
      } else {
        say(res.status === 429 ? t.limit : data.error === 'identidade' ? t.identity : t.fail);
      }
    } catch (_) {
      say(t.fail);
    }
    form.dataset.busy = '';
  });
}
