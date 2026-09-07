// ─────────────────────────────────────────────────────────────────────
// A pesquisa (⌘K).
//
// Procura em três sítios — aplicações, escritos e ligações — e mostra
// cada um no seu grupo. A lista navega-se com as setas e escolhe-se com
// o Enter, sem tirar as mãos do teclado, que é a razão de existir.
//
// Acrescentar uma fonte de resultados é acrescentar uma entrada em
// `sources`: devolve um grupo, ou nada se não tiver o que mostrar.
// ─────────────────────────────────────────────────────────────────────
import { esc } from '../lib/dom.js';

export function createSpotlight(desk) {
  const { ctx, els, s } = desk;
  const { spotlight, spotInput, spotResults } = els;

  let items = [];
  let index = 0;

  const visible = () => !spotlight.hidden;
  const close = () => (spotlight.hidden = true);

  function open() {
    spotlight.hidden = false;
    spotInput.value = '';
    render('');
    setTimeout(() => spotInput.focus(), 20);
  }

  /** As fontes de resultados, pela ordem por que aparecem. */
  const sources = [
    (match) => {
      const apps = ctx.data.apps.filter((a) => (!a.macOnly || ctx.mode === 'mac') && (match(a.name) || match(a.subtitle)));
      if (!apps.length) return null;
      return {
        title: s.searchApps,
        items: apps.map((a) => ({ icon: 'icon-' + a.id, label: a.name, sub: a.subtitle, action: 'open:' + a.id })),
      };
    },
    (match) => {
      const posts = ctx.data.posts.filter((p) => match(p.title) || match(p.description));
      if (!posts.length) return null;
      return {
        title: s.searchPosts,
        items: posts.map((p) => ({ icon: 'ui-note', label: p.title, sub: p.date, action: 'post:' + p.slug })),
      };
    },
    (match) => {
      const links = [
        { label: 'GitHub', action: 'link:github' },
        { label: 'LinkedIn', action: 'link:linkedin' },
        { label: 'X', action: 'link:twitter' },
        { label: ctx.data.site.email, action: 'mail' },
      ].filter((l) => match(l.label));
      if (!links.length) return null;
      return {
        title: s.searchLinks,
        items: links.map((l) => ({ icon: 'ui-arrow', label: l.label, sub: '', action: l.action })),
      };
    },
  ];

  function render(query) {
    const q = query.trim().toLowerCase();
    const match = (t) => !q || String(t).toLowerCase().includes(q);
    const groups = sources.map((source) => source(match)).filter(Boolean);

    items = [];
    spotResults.innerHTML = groups.length
      ? groups
          .map((g) => {
            const rows = g.items
              .map((it) => {
                items.push(it);
                return (
                  `<button class="spot-item" type="button" role="option" data-action="${esc(it.action)}">` +
                  `<svg viewBox="0 0 100 100" aria-hidden="true"><use href="#${esc(it.icon)}"/></svg>` +
                  `<span>${esc(it.label)}</span><span class="sub">${esc(it.sub || '')}</span></button>`
                );
              })
              .join('');
            return `<p class="spot-group">${esc(g.title)}</p>${rows}`;
          })
          .join('')
      : `<p class="spot-group">${esc(s.searchEmpty)}</p>`;
    index = 0;
    mark();
  }

  function mark() {
    const els_ = [...spotResults.querySelectorAll('.spot-item')];
    els_.forEach((el, i) => el.setAttribute('aria-selected', i === index ? 'true' : 'false'));
    const cur = els_[index];
    if (cur) cur.scrollIntoView({ block: 'nearest' });
  }

  spotInput.addEventListener('input', () => render(spotInput.value));
  spotResults.addEventListener('click', (ev) => {
    const b = ev.target.closest('.spot-item');
    if (!b) return;
    close();
    ctx.run(b.dataset.action);
  });
  spotlight.addEventListener('click', (ev) => {
    if (ev.target === spotlight) close();
  });
  spotInput.addEventListener('keydown', (ev) => {
    const count = spotResults.querySelectorAll('.spot-item').length;
    if (ev.key === 'ArrowDown') {
      index = Math.min(count - 1, index + 1);
      mark();
      ev.preventDefault();
    } else if (ev.key === 'ArrowUp') {
      index = Math.max(0, index - 1);
      mark();
      ev.preventDefault();
    } else if (ev.key === 'Enter') {
      const it = items[index];
      if (it) {
        close();
        ctx.run(it.action);
      }
      ev.preventDefault();
    }
  });

  return { open, close, visible };
}
