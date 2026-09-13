import { esc } from '../lib/dom.js';

// A caixa de entrada das Mensagens — só o dono.
//
// Toda a gente que escreveu ao assistente aparece aqui, uma linha por
// pessoa, com a última coisa que disse e quando. O backend já recusa
// /api/mensagens a quem não é o dono (owner_guard.py); isto é só a
// camada visual: sem sessão de dono a coluna nem existe, e a app é a
// conversa de sempre.
//
// A metade de baixo (as bolhas, o cabeçalho) é de mensagens.js, e
// chama-se por `ctx.mensagens` — nunca por importação directa.
export function initInbox(ctx) {
  const el = ctx.contentNode('mensagens');
  if (!el) return;
  const sidebar = el.querySelector('[data-msg-sidebar]');
  if (!sidebar) return;
  const list = el.querySelector('[data-msg-conv-list]');
  const empty = el.querySelector('[data-msg-conv-empty]');
  const search = el.querySelector('[data-msg-search]');
  const counter = el.querySelector('[data-msg-count]');
  const back = el.querySelector('[data-msg-back]');
  const t = ctx.data.strings.chat;

  let rows = [];
  let openId = null;
  let revealed = false;

  /** As conversas antigas de visitantes anónimos não têm email — a
      partir de agora falar pede sessão, por isso as novas têm sempre.
      Ver chat_store.py. */
  const label = (row) => row.email || t.visitor;
  const emailOf = (row) => row.email || '';

  function render() {
    const q = (search && search.value.trim().toLowerCase()) || '';
    const shown = rows.filter((r) => !q || (label(r) + ' ' + (r.preview || '')).toLowerCase().includes(q));
    empty.hidden = shown.length > 0;
    if (counter) counter.textContent = rows.length ? String(rows.length) : '';
    list.innerHTML = shown
      .map((row) => {
        const name = label(row);
        const on = row.conversation === openId;
        return (
          '<li><button type="button" class="msg-conv' + (on ? ' on' : '') + '" data-conv="' + esc(row.conversation) + '">' +
          '<span class="msg-avatar" aria-hidden="true">' + esc(ctx.mensagens.initials(name)) + '</span>' +
          '<span class="msg-conv-body">' +
          '<span class="msg-conv-top">' +
          '<span class="msg-conv-name">' + esc(name) + '</span>' +
          '<span class="msg-conv-when">' + esc(ctx.mensagens.relativeWhen(row.last)) + '</span>' +
          '</span>' +
          '<span class="msg-conv-preview">' + esc(row.preview || (row.turns + ' ' + (t.turns || ''))) + '</span>' +
          '</span></button></li>'
        );
      })
      .join('');
  }

  async function load() {
    if (!revealed) {
      sidebar.hidden = false;
      sidebar.removeAttribute('aria-hidden');
      revealed = true;
    }
    try {
      const res = await fetch('/api/mensagens', { headers: { Accept: 'application/json' } });
      if (!res.ok) return;
      const data = await res.json().catch(() => null);
      if (!data || !data.ok) return;
      rows = data.conversations || [];
      render();
    } catch (_) {
      // Sem lista, fica a coluna vazia — a app não parte por isso.
    }
  }

  async function open(id) {
    openId = id;
    render();
    const row = rows.find((r) => r.conversation === id);
    try {
      const res = await fetch('/api/mensagens/' + encodeURIComponent(id), { headers: { Accept: 'application/json' } });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data || !data.ok) return;
      ctx.mensagens.showTranscript(row ? label(row) : id, row ? emailOf(row) : '', data.turns || []);
    } catch (_) {
      // A conversa fica como estava — sem partir a vista.
    }
  }

  if (search) search.addEventListener('input', render);
  list.addEventListener('click', (ev) => {
    const btn = ev.target.closest('[data-conv]');
    if (btn) open(btn.dataset.conv);
  });
  // Voltar: só existe quando a coluna e a conversa são dois ecrãs.
  if (back)
    back.addEventListener('click', () => {
      openId = null;
      render();
      ctx.mensagens.pickNothing();
    });

  // `conversations` é para o badge do ícone saber quantas têm coisa
  // nova — a lista é a mesma, e o `fetch` continua a ser só este.
  ctx.inbox = { load, conversations: () => rows };
}
