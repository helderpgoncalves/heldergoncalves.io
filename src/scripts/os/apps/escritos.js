import { esc } from '../lib/dom.js';

export function initEscritos(ctx) {
  const el = ctx.contentNode('escritos');
  if (!el) return;
  const reader = el.querySelector('[data-reader]');
  const cache = new Map();
  const seeded = el.querySelector('[data-post-body]');
  if (seeded) cache.set(seeded.dataset.postBody, seeded.outerHTML);

  const post = (slug) => ctx.data.posts.find((p) => p.slug === slug);

  function mark(slug) {
    el.querySelectorAll('.post-link').forEach((a) => {
      if (slug && a.dataset.post === slug) a.setAttribute('aria-current', 'true');
      else a.removeAttribute('aria-current');
    });
  }

  async function show(slug, push) {
    const p = post(slug);
    if (!p) return;
    if (!cache.has(slug)) {
      reader.innerHTML = '<div class="app-main-empty"><p>…</p></div>';
      try {
        const res = await fetch(p.url, { headers: { Accept: 'text/html' } });
        if (!res.ok) throw new Error('http ' + res.status);
        const doc = new DOMParser().parseFromString(await res.text(), 'text/html');
        const body = doc.querySelector('[data-post-body]');
        if (!body) throw new Error('sem corpo');
        cache.set(slug, body.outerHTML);
      } catch (_) {
        location.href = p.url;
        return;
      }
    }
    reader.innerHTML = cache.get(slug);
    reader.scrollTop = 0;
    el.dataset.detail = '1';
    mark(slug);
    document.title = p.title + ' — ' + ctx.data.site.name;
    if (push) history.pushState({ app: 'escritos', post: slug }, '', p.url);
    // Através do objecto partilhado, nunca por importação directa — ver
    // .claude/rules/cliente.md. `comentarios.js` já tratou do escrito
    // servido no arranque sozinho; isto é só para as trocas seguintes.
    if (ctx.comentarios) ctx.comentarios.onShow(slug);
  }

  function list(push) {
    el.dataset.detail = '0';
    reader.innerHTML =
      '<div class="app-main-empty"><svg viewBox="0 0 100 100" width="42" height="42" aria-hidden="true">' +
      '<use href="#ui-note"/></svg><p>' +
      esc(ctx.data.strings.escritos.pick) +
      '</p></div>';
    mark(null);
    if (push) history.pushState({ app: 'escritos' }, '', ctx.data.routes[ctx.data.lang].blog);
  }

  el.addEventListener('click', (ev) => {
    const link = ev.target.closest('.post-link');
    if (link) {
      ev.preventDefault();
      show(link.dataset.post, true);
      return;
    }
    if (ev.target.closest('[data-back-list]')) list(true);
    else if (ev.target.closest('[data-notes-sidebar]')) el.classList.toggle('side-hidden');
    else {
      const act = ev.target.closest('[data-action]');
      if (act) ctx.run(act.dataset.action);
    }
  });

  // ── A pesquisa da lista ────────────────────────────────────────────
  // Filtra ao escrever, esconde os meses que ficam vazios, e diz quando
  // não sobra nada. Os dois campos (Mac e telefone) andam a par.
  const fields = [...el.querySelectorAll('[data-notes-search]')];
  const empty = el.querySelector('[data-notes-empty]');
  function filter(query) {
    const q = query.trim().toLowerCase();
    let left = 0;
    el.querySelectorAll('.post-group').forEach((group) => {
      let kept = 0;
      group.querySelectorAll('.post-link').forEach((a) => {
        const hit = !q || a.textContent.toLowerCase().includes(q);
        a.parentElement.hidden = !hit;
        if (hit) kept += 1;
      });
      group.hidden = kept === 0;
      left += kept;
    });
    if (empty) empty.hidden = left > 0 || !q;
  }
  fields.forEach((field) =>
    field.addEventListener('input', () => {
      fields.forEach((other) => {
        if (other !== field) other.value = field.value;
      });
      filter(field.value);
    })
  );

  ctx.escritos = {
    show,
    list,
    hasDetail: () => el.dataset.detail === '1',
    pane: () => el.querySelector('.app-main'),
  };
}
