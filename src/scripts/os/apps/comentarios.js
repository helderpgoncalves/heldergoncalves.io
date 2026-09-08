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
//
// Comentar e reagir pedem sessão, mas o formulário está sempre visível
// — é o padrão do sistema (ver lib/retomar.js): tenta-se sempre, e só
// se faltar sessão é que se guarda o que se ia enviar e se abre
// "Entrar". Ninguém perde o que já tinha escrito.
// ─────────────────────────────────────────────────────────────────────
import { esc } from '../lib/dom.js';
import { requestToken } from '../lib/session.js';
import { chamarComSessao } from '../lib/retomar.js';

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
          '<li class="comment border-[0.5px] border-(--line) bg-(--surface-solid) px-3.5 py-3"><p class="comment-head m-0 mb-1 text-[length:var(--t-caption)] font-semibold text-(--ink-2)">' + esc(c.name) + '</p>' +
          '<p class="comment-body m-0 whitespace-pre-wrap text-[length:var(--t-subhead)] leading-[1.5] text-(--ink)">' + esc(c.body) + '</p></li>'
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

  async function load(slug) {
    const sec = section();
    if (!sec) return;
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
    // Chamado por ctx.onSessionChange — depois de entrar (e, sobretudo,
    // depois de lib/retomar.js repetir um comentário/reacção pendente),
    // a lista tem de reflectir o que acabou de ser gravado.
    refresh: () => currentSlug && load(currentSlug),
  };

  // O escrito já podia vir servido no arranque — carrega os comentários
  // dele sem esperar por nenhuma navegação.
  const seeded = section();
  if (seeded) onShow(seeded.dataset.comments);

  el.addEventListener('click', async (ev) => {
    const btn = ev.target.closest('[data-reaction]');
    if (!btn || !currentSlug) return;
    const kind = btn.dataset.reaction;
    const res = await chamarComSessao(ctx, { url: '/api/comentarios/reagir', body: { post: currentSlug, kind } });
    if (res.needsAuth || !res.ok) return;
    const sec = section();
    if (!sec) return;
    btn.setAttribute('aria-pressed', String(res.data.active));
    sec.querySelectorAll('[data-reaction]').forEach((b) => {
      const countEl = b.querySelector('[data-reaction-count]');
      if (countEl) countEl.textContent = String((res.data.reactions && res.data.reactions[b.dataset.reaction]) || 0);
    });
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

    const res = await chamarComSessao(ctx, {
      url: '/api/comentarios',
      body: {
        post: currentSlug,
        name: (form.querySelector('[data-comments-name]') || {}).value || '',
        body,
        lang: ctx.data.lang,
        token,
        company: (form.querySelector('[data-comments-trap]') || {}).value || '',
      },
    });
    form.dataset.busy = '';

    if (res.needsAuth) {
      // O texto fica no formulário — ninguém o perde. lib/retomar.js
      // repete este mesmo pedido sozinho assim que a sessão existir, e
      // `load(currentSlug)` mostra o resultado quando o retrato reabrir
      // este escrito (ver retomar() em lib/retomar.js).
      return say(t.signInFirst);
    }
    if (res.ok) {
      form.reset();
      say(t.sent);
      load(currentSlug);
    } else {
      say(res.status === 429 ? t.limit : t.fail);
    }
  });
}
