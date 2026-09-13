import { esc } from '../lib/dom.js';
import { whoAmI } from '../lib/session.js';

// A caixa de entrada da Mail — só o dono.
//
// Toda a gente que escreveu ao Hélder pelo site aparece aqui, uma linha
// por pessoa, com o assunto e o princípio da última mensagem. O backend
// já recusa /api/mail a quem não é o dono (owner_guard.py); isto é só a
// camada visual: sem sessão de dono a lista nem existe, e a app é a
// folha de escrever de sempre.
//
// A metade de baixo (a conversa, a resposta, o rascunho) é de
// contacto.js, e chama-se por `ctx.mailThread` — nunca por importação
// directa (ver .claude/rules/cliente.md).
//
// O «por ler» é desta peça e vive no `localStorage`, como em badges.js:
// é uma conveniência de quem está a ver deste dispositivo, não estado
// partilhado, e por isso nunca vai ao servidor. A chave é por pessoa
// (quem tem a sessão) e por conversa, e o acesso é sempre dentro de um
// try — em modo privado o `localStorage` lança, e nada pode partir por
// causa disso.
const KEY = 'helderos-mail-lidas';

export function initInboxMail(ctx) {
  const el = ctx.contentNode('contacto');
  if (!el) return;
  const sidebar = el.querySelector('[data-mail-sidebar]');
  if (!sidebar) return;
  const list = el.querySelector('[data-mail-list]');
  const empty = el.querySelector('[data-mail-empty]');
  const counter = el.querySelector('[data-mail-count]');
  const w = ctx.data.strings.mail;

  let rows = [];
  let openId = null;
  let quem = '-';
  let revealed = false;

  // ── As marcas de leitura ──────────────────────────────────────────
  const todas = () => {
    try {
      return JSON.parse(localStorage.getItem(KEY) || '{}') || {};
    } catch (_) {
      return {};
    }
  };

  const guardar = (valor) => {
    try {
      localStorage.setItem(KEY, JSON.stringify(valor));
    } catch (_) {
      /* modo privado: as marcas valem só para esta sessão */
    }
  };

  // Comparar ISO como texto parte-se sozinho: basta uma fonte sem
  // milissegundos para `...:00Z` ficar «maior» que `...:00.000Z`.
  // Compara-se em instantes, como em badges.js.
  const instante = (iso) => {
    const v = Date.parse(iso || '');
    return Number.isNaN(v) ? 0 : v;
  };

  const minhas = () => todas()[quem] || {};
  const porLer = (row) => instante(row.last) > (minhas()[row.conversation] || 0);

  /** Abrir uma conversa é lê-la: a marca passa a ser o instante da
      última mensagem que lá está. */
  function marcarLida(row) {
    if (!row) return;
    const registo = todas();
    const meu = registo[quem] || (registo[quem] = {});
    meu[row.conversation] = Math.max(meu[row.conversation] || 0, instante(row.last));
    guardar(registo);
  }

  // ── Desenhar ──────────────────────────────────────────────────────
  function render() {
    empty.hidden = rows.length > 0;
    const novas = rows.filter(porLer).length;
    if (counter) counter.textContent = novas ? w.unread.replace('{n}', String(novas)) : w.allRead;
    // O badge do ícone é o mesmo número — `ctx.badges.set` existe para
    // isto e não precisa de HTML nem CSS a mexer (ver badges.js).
    if (ctx.badges) ctx.badges.set('contacto', novas);

    list.innerHTML = rows
      .map((row) => {
        const nome = row.email || '';
        const on = row.conversation === openId;
        return (
          '<li><button type="button" class="mail-row' +
          (on ? ' on' : '') +
          (porLer(row) ? ' unread' : '') +
          '" data-conv="' + esc(row.conversation) + '">' +
          '<span class="mail-dot" aria-hidden="true"></span>' +
          '<span class="mail-row-body">' +
          '<span class="mail-row-top">' +
          '<span class="mail-row-name">' + esc(nome) + '</span>' +
          '<span class="mail-row-when">' + esc(ctx.mailThread.relativeWhen(row.last)) +
          '<svg viewBox="0 0 100 100" width="11" height="11" aria-hidden="true"><use href="#ui-chevron"/></svg>' +
          '</span></span>' +
          '<span class="mail-row-subject">' + esc(row.subject || w.noSubject) + '</span>' +
          '<span class="mail-row-preview">' + esc(row.preview || '') + '</span>' +
          '</span></button></li>'
        );
      })
      .join('');
  }

  // ── O servidor ────────────────────────────────────────────────────
  async function load() {
    if (!revealed) {
      sidebar.hidden = false;
      sidebar.removeAttribute('aria-hidden');
      revealed = true;
    }
    // `whoAmI` guarda a resposta — isto não é um pedido novo.
    quem = (await whoAmI()) || '-';
    try {
      const res = await fetch('/api/mail', { headers: { Accept: 'application/json' } });
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
    const row = rows.find((r) => r.conversation === id);
    openId = id;
    marcarLida(row);
    render();
    try {
      const res = await fetch('/api/mail/' + encodeURIComponent(id), { headers: { Accept: 'application/json' } });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data || !data.ok) return;
      ctx.mailThread.showThread(row || { conversation: id, email: '', subject: '' }, data.messages || []);
    } catch (_) {
      // A conversa fica como estava — sem partir a vista.
    }
  }

  /** Depois de responder: a lista muda (o excerto passa a ser a
      resposta) e a conversa tem mais uma mensagem. Recarregar as duas é
      o que evita inventar aqui a linha que o servidor já sabe escrever. */
  async function reopen() {
    const id = openId;
    await load();
    if (id) await open(id);
  }

  list.addEventListener('click', (ev) => {
    const btn = ev.target.closest('[data-conv]');
    if (btn) open(btn.dataset.conv);
  });

  // `conversations` é para quem quiser as contas sem pedir outra vez ao
  // servidor; `closed` é o voltar, que é da outra metade.
  ctx.mailInbox = {
    load,
    reopen,
    conversations: () => rows,
    closed: () => {
      openId = null;
      render();
    },
  };
}
