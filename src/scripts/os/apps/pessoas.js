// ─────────────────────────────────────────────────────────────────────
// Pessoas — quem já entrou no site, só para o dono. Uma tabela, uma
// chamada a `/api/pessoas`; o próprio backend decide quem a vê.
// ─────────────────────────────────────────────────────────────────────
import { esc } from '../lib/dom.js';

export function initPessoas(ctx) {
  const el = ctx.contentNode('pessoas');
  if (!el) return;
  const t = ctx.data.strings.pessoas;

  const lead = el.querySelector('[data-ppl-lead]');
  const only = el.querySelector('[data-ppl-only]');
  const list = el.querySelector('[data-ppl-list]');
  const empty = el.querySelector('[data-ppl-empty]');

  const dateFmt = new Intl.DateTimeFormat(ctx.data.intlLocale, { dateStyle: 'medium', timeStyle: 'short' });
  const fmt = (iso) => {
    try {
      return dateFmt.format(new Date(iso));
    } catch (_) {
      return iso;
    }
  };

  async function load() {
    try {
      const res = await fetch('/api/pessoas', { headers: { Accept: 'application/json' } });
      if (res.status === 401 || res.status === 403) {
        lead.hidden = true;
        only.hidden = false;
        list.hidden = true;
        empty.hidden = true;
        return;
      }
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) {
        only.hidden = false;
        return;
      }
      lead.hidden = false;
      only.hidden = true;
      const people = data.people || [];
      empty.hidden = people.length > 0;
      list.hidden = people.length === 0;
      const AVATAR_CLS = 'ppl-avatar col-start-1 row-span-2 h-8 w-8 rounded-full object-cover bg-(--surface-3)';
      list.innerHTML = people
        .map((p) => {
          const avatar = p.avatar_url
            ? '<img class="' + AVATAR_CLS + '" src="' + esc(p.avatar_url) + '" alt="" loading="lazy" referrerpolicy="no-referrer">'
            : '<span class="' + AVATAR_CLS + ' ppl-avatar--placeholder bg-(--gray4)" aria-hidden="true"></span>';
          return (
            '<li class="ppl-row grid grid-cols-[32px_1fr] items-center gap-2.75 border-[0.5px] border-(--line) bg-(--surface-2) px-3.75 py-2.75">' + avatar + '<p class="ppl-email m-0 mb-0.75 text-[length:var(--t-subhead)] font-semibold">' + esc(p.email) + '</p>' +
            '<p class="ppl-meta m-0 text-[length:var(--t-caption)] text-(--ink-3)">' + esc(t.firstSeen) + ' ' + esc(fmt(p.first_seen)) +
            ' · ' + esc(t.lastSeen) + ' ' + esc(fmt(p.last_seen)) + ' · ' + esc(String(p.visits)) + ' ' + esc(t.visits) + '</p></li>'
          );
        })
        .join('');
    } catch (_) {
      only.hidden = false;
    }
  }

  el.querySelector('[data-action="entrar"]')?.addEventListener('click', () => ctx.run('entrar'));

  ctx.pessoas = { refresh: load };
  let prepared = false;
  ctx.preparePessoas = () => {
    if (prepared) return;
    prepared = true;
    load();
  };
}
