import { esc } from '../lib/dom.js';

export function initEscritos(ctx) {
  const el = ctx.contentNode('escritos');
  if (!el) return;
  const reader = el.querySelector('[data-reader]');
  const cache = new Map();
  const seeded = el.querySelector('[data-post-body]');
  if (seeded) cache.set(seeded.dataset.postBody, seeded.outerHTML);

  let currentSlug = seeded ? seeded.dataset.postBody : null;

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
    // Ler um escrito fecha o editor do dono, se estava aberto.
    el.dataset.editing = '0';
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
    currentSlug = slug;
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
    el.dataset.editing = '0';
    currentSlug = null;
    reader.innerHTML =
      '<div class="app-main-empty"><svg viewBox="0 0 100 100" width="42" height="42" aria-hidden="true">' +
      '<use href="#ui-note"/></svg><p>' +
      esc(ctx.data.strings.escritos.pick) +
      '</p></div>';
    mark(null);
    if (push) history.pushState({ app: 'escritos' }, '', ctx.data.routes[ctx.data.lang].blog);
  }

  // A barra de ferramentas sobe para a barra de título no Mac
  // (mac/windows.js), e aí já não está debaixo do nó da app — por isso
  // ouve-se nela própria; o listener viaja com o nó para onde ele for.
  // A classe da sidebar escondida vai para os dois, pelo mesmo motivo.
  const toolbar = el.querySelector('[data-win-toolbar]');
  const toggleSidebar = () => {
    const hidden = el.classList.toggle('side-hidden');
    if (toolbar) toolbar.classList.toggle('side-hidden', hidden);
  };

  function onAction(ev) {
    if (ev.target.closest('[data-notes-sidebar]')) return toggleSidebar();
    const act = ev.target.closest('[data-action]');
    if (!act) return;
    // Compor: para o dono é um escrito novo (escritos-editor.js); para
    // toda a gente, escrever ao Hélder — como sempre foi.
    if (act.dataset.action === 'mail' && ctx.escritosEditor && ctx.escritosEditor.isOwner()) return ctx.escritosEditor.novo();
    ctx.run(act.dataset.action);
  }
  if (toolbar) toolbar.addEventListener('click', onAction);

  el.addEventListener('click', (ev) => {
    if (toolbar && toolbar.contains(ev.target)) return;
    const link = ev.target.closest('.post-link');
    if (link) {
      ev.preventDefault();
      if (link.dataset.draft) ctx.escritosEditor && ctx.escritosEditor.abrir(link.dataset.draft);
      else show(link.dataset.post, true);
      return;
    }
    if (ev.target.closest('[data-back-list]')) list(true);
    else onAction(ev);
  });

  // ── A pesquisa da lista, cruzada com a pasta ────────────────────────
  // Filtra ao escrever e ao trocar de pasta, esconde os meses que ficam
  // vazios, e diz quando não sobra nada. Os dois campos (Mac e
  // telefone) andam a par.
  const fields = [...el.querySelectorAll('[data-notes-search]')];
  const empty = el.querySelector('[data-notes-empty]');
  let currentFolder = 'all';
  function filter(query, folder) {
    if (folder !== undefined) currentFolder = folder;
    el.dataset.folder = currentFolder;
    const q = query.trim().toLowerCase();
    let left = 0;
    el.querySelectorAll('.post-group').forEach((group) => {
      let kept = 0;
      group.querySelectorAll('.post-link').forEach((a) => {
        // Os rascunhos do dono só aparecem em «Todos» e na pasta deles;
        // os escritos publicados, em «Todos» e nas pastas dos seus temas.
        const inFolder = a.dataset.draft
          ? currentFolder === 'all' || currentFolder === 'rascunhos'
          : currentFolder === 'all' || (a.dataset.tags || '').split('|').includes(currentFolder);
        const hit = inFolder && (!q || a.textContent.toLowerCase().includes(q));
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

  const folders = el.querySelector('.notes-folders');
  if (folders) {
    folders.addEventListener('click', (ev) => {
      const btn = ev.target.closest('.folder-item');
      if (!btn) return;
      folders.querySelectorAll('.folder-item').forEach((f) => f.removeAttribute('aria-current'));
      btn.setAttribute('aria-current', 'true');
      filter(fields[0] ? fields[0].value : '', btn.dataset.folder);
    });
  }

  ctx.escritos = {
    show,
    list,
    mark,
    // O editor do dono acrescenta rascunhos à lista e precisa de a
    // voltar a filtrar com a pasta e a pesquisa que já estavam.
    refilter: () => filter(fields[0] ? fields[0].value : ''),
    hasDetail: () => el.dataset.detail === '1',
    pane: () => el.querySelector('.app-main'),
    currentSlug: () => currentSlug,
    toggleSidebar,
  };
}
