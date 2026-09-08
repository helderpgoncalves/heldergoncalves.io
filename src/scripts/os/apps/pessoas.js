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

  const viaLabel = (via) => (via === 'google' ? t.viaGoogle : t.viaCodigo);
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
      list.innerHTML = people
        .map(
          (p) =>
            '<li class="ppl-row"><p class="ppl-email">' + esc(p.email) + '</p>' +
            '<p class="ppl-meta">' + esc(viaLabel(p.via)) + ' · ' + esc(t.firstSeen) + ' ' + esc(fmt(p.first_seen)) +
            ' · ' + esc(t.lastSeen) + ' ' + esc(fmt(p.last_seen)) + ' · ' + esc(String(p.visits)) + ' ' + esc(t.visits) + '</p></li>'
        )
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
