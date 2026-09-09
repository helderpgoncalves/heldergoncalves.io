// ─────────────────────────────────────────────────────────────────────
// Pessoas — quem já entrou no site, só para o dono. Uma tabela, uma
// chamada a `/api/pessoas`; o próprio backend decide quem a vê. O
// desenho segue o Finder: uma barra lateral com filtros, a lista ao
// meio, e o detalhe de quem está seleccionada à direita.
// ─────────────────────────────────────────────────────────────────────
import { esc } from '../lib/dom.js';

const RECENT_DAYS = 7;

export function initPessoas(ctx) {
  const el = ctx.contentNode('pessoas');
  if (!el) return;
  const t = ctx.data.strings.pessoas;

  const only = el.querySelector('[data-ppl-only]');
  const shell = el.querySelector('[data-ppl-shell]');
  const title = el.querySelector('[data-ppl-title]');
  const search = el.querySelector('[data-ppl-search]');
  const list = el.querySelector('[data-ppl-list]');
  const empty = el.querySelector('[data-ppl-empty]');
  const emptyText = el.querySelector('[data-ppl-empty-text]');
  const detail = el.querySelector('[data-ppl-detail]');
  const detailAvatar = el.querySelector('[data-ppl-detail-avatar]');
  const detailPlaceholder = el.querySelector('[data-ppl-detail-placeholder]');
  const detailEmail = el.querySelector('[data-ppl-detail-email]');
  const detailFirst = el.querySelector('[data-ppl-detail-first]');
  const detailLast = el.querySelector('[data-ppl-detail-last]');
  const detailVisits = el.querySelector('[data-ppl-detail-visits]');

  const dateFmt = new Intl.DateTimeFormat(ctx.data.intlLocale, { dateStyle: 'medium', timeStyle: 'short' });
  const fmt = (iso) => {
    try {
      return dateFmt.format(new Date(iso));
    } catch (_) {
      return iso;
    }
  };

  let people = [];
  let filter = 'all';
  let query = '';
  let selected = null;

  const isRecent = (p) => Date.now() - new Date(p.last_seen).getTime() < RECENT_DAYS * 24 * 60 * 60 * 1000;

  function visible() {
    const q = query.trim().toLowerCase();
    return people.filter((p) => {
      if (filter === 'recent' && !isRecent(p)) return false;
      if (q && !p.email.toLowerCase().includes(q)) return false;
      return true;
    });
  }

  function renderDetail(p) {
    if (!p) {
      detail.hidden = true;
      return;
    }
    detail.hidden = false;
    if (p.avatar_url) {
      detailAvatar.src = p.avatar_url;
      detailAvatar.hidden = false;
      detailPlaceholder.hidden = true;
    } else {
      detailAvatar.hidden = true;
      detailPlaceholder.hidden = false;
    }
    detailEmail.textContent = p.email;
    detailFirst.textContent = fmt(p.first_seen);
    detailLast.textContent = fmt(p.last_seen);
    detailVisits.textContent = String(p.visits);
  }

  function render() {
    const rows = visible();
    empty.hidden = rows.length > 0;
    list.hidden = rows.length === 0;
    emptyText.textContent = query.trim() ? t.emptySearch : t.empty;

    const AVATAR_CLS = 'ppl-avatar col-start-1 row-span-2 h-8 w-8 rounded-full object-cover bg-(--surface-3)';
    list.innerHTML = rows
      .map((p) => {
        const avatar = p.avatar_url
          ? '<img class="' + AVATAR_CLS + '" src="' + esc(p.avatar_url) + '" alt="" loading="lazy" referrerpolicy="no-referrer">'
          : '<span class="' + AVATAR_CLS + ' ppl-avatar--placeholder bg-(--gray4)" aria-hidden="true"></span>';
        const on = p.email === selected;
        return (
          '<li>' +
          '<button type="button" class="ppl-row grid w-full grid-cols-[32px_1fr] items-center gap-2.75 px-3.75 py-2.75 text-left' +
          (on ? ' bg-(--accent) text-white' : ' hover:bg-(--surface-3)') +
          '" data-ppl-row="' + esc(p.email) + '">' + avatar +
          '<p class="ppl-email m-0 mb-0.75 truncate text-[length:var(--t-subhead)] font-semibold">' + esc(p.email) + '</p>' +
          '<p class="ppl-meta m-0 truncate text-[length:var(--t-caption)]' + (on ? ' text-white/80' : ' text-(--ink-3)') + '">' +
          esc(t.lastSeen) + ' ' + esc(fmt(p.last_seen)) + ' · ' + esc(String(p.visits)) + ' ' + esc(t.visits) + '</p></button></li>'
        );
      })
      .join('');

    if (selected && !rows.some((p) => p.email === selected)) selected = null;
    renderDetail(people.find((p) => p.email === selected) || null);
  }

  async function load() {
    try {
      const res = await fetch('/api/pessoas', { headers: { Accept: 'application/json' } });
      if (res.status === 401 || res.status === 403) {
        only.hidden = false;
        shell.hidden = true;
        return;
      }
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) {
        only.hidden = false;
        shell.hidden = true;
        return;
      }
      only.hidden = true;
      shell.hidden = false;
      people = data.people || [];
      render();
    } catch (_) {
      only.hidden = false;
      shell.hidden = true;
    }
  }

  el.querySelector('[data-action="entrar"]')?.addEventListener('click', () => ctx.run('entrar'));

  el.querySelectorAll('[data-ppl-filter]').forEach((btn) => {
    btn.addEventListener('click', () => {
      filter = btn.dataset.pplFilter;
      title.textContent = filter === 'recent' ? t.recent : t.everyone;
      el.querySelectorAll('[data-ppl-filter]').forEach((b) => b.setAttribute('aria-pressed', String(b === btn)));
      render();
    });
  });

  search.addEventListener('input', () => {
    query = search.value;
    render();
  });

  list.addEventListener('click', (ev) => {
    const row = ev.target.closest('[data-ppl-row]');
    if (!row) return;
    selected = row.dataset.pplRow;
    render();
  });

  el.querySelector('[data-ppl-detail-close]')?.addEventListener('click', () => {
    selected = null;
    render();
  });

  ctx.pessoas = { refresh: load };
  let prepared = false;
  ctx.preparePessoas = () => {
    if (prepared) return;
    prepared = true;
    load();
  };
}
