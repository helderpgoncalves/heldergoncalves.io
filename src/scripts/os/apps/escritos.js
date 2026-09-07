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
  });

  ctx.escritos = {
    show,
    list,
    hasDetail: () => el.dataset.detail === '1',
    pane: () => el.querySelector('.app-main'),
  };
}
