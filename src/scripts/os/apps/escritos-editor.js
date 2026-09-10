// ─────────────────────────────────────────────────────────────────────
// O dono escreve a partir do site.
//
// Só acorda quando a sessão é a do dono: marca a app com `data-owner`,
// que é o que faz aparecer a pasta «Rascunhos» e o grupo no topo da
// lista (Escritos.astro). O editor vive por cima do leitor, ligado por
// `data-editing`; guarda sozinho um instante depois de se parar de
// escrever, e «Publicar» faz o commit no repositório — o site refaz-se
// com o push, como sempre (ver DEPLOY.md, «Escrever a partir do site»).
//
// Fala com escritos.js através do objecto partilhado (`ctx.escritos`),
// nunca por importação directa — ver .claude/rules/cliente.md.
// ─────────────────────────────────────────────────────────────────────
import { amIOwner, postJson } from '../lib/session.js';

const SAVE_DELAY = 1200;

export function initEscritosEditor(ctx) {
  const el = ctx.contentNode('escritos');
  if (!el) return;
  const t = ctx.data.strings.editor;
  const editor = el.querySelector('[data-editor]');
  const listEl = el.querySelector('[data-drafts-list]');
  const countEl = el.querySelector('[data-drafts-count]');
  const status = el.querySelector('[data-editor-status]');
  const publishBtn = el.querySelector('[data-editor-publish]');
  if (!editor || !listEl) return;

  const fields = {};
  editor.querySelectorAll('[data-editor-field]').forEach((f) => (fields[f.dataset.editorField] = f));

  let owner = false;
  let canPublish = false;
  let drafts = [];
  let current = null;
  let dirty = false;
  let timer = null;
  let busy = false;

  const dateFmt = new Intl.DateTimeFormat(ctx.data.intlLocale || undefined, { day: '2-digit', month: '2-digit', year: '2-digit' });
  const say = (text) => {
    if (status) status.textContent = text || '';
  };
  const stateLabel = (d) => (d.estado === 'publicado' ? t.statusPublished : d.commit_sha ? t.statusChanged : t.statusDraft);

  // ── A lista ────────────────────────────────────────────────────────
  function renderList() {
    listEl.textContent = '';
    drafts.forEach((d) => {
      const li = document.createElement('li');
      const a = document.createElement('a');
      a.className =
        'post-link relative grid w-full gap-px px-2.5 py-1.75 text-left text-inherit no-underline hover:bg-(--surface-3) hover:no-underline aria-current:bg-(--notes-select) aria-current:text-(--notes-select-ink) aria-current:[&_.post-sub]:text-(--notes-select-ink) aria-current:[&_.post-sub]:opacity-75 [[data-mode=ios]_&]:gap-0.5 [[data-mode=ios]_&]:px-4 [[data-mode=ios]_&]:py-2.5';
      a.href = '#';
      a.dataset.draft = d.id;
      const h3 = document.createElement('h3');
      h3.className = 'm-0 overflow-hidden text-ellipsis whitespace-nowrap text-[length:var(--t-headline,13px)] font-semibold tracking-[-0.01em]';
      h3.textContent = d.titulo || t.untitled;
      const sub = document.createElement('span');
      sub.className = 'post-sub flex min-w-0 items-baseline gap-1.5 overflow-hidden whitespace-nowrap text-[length:var(--t-subhead,11px)] text-(--ink-3)';
      const when = document.createElement('time');
      when.className = 'flex-none text-(--ink-2)';
      when.dateTime = d.atualizado_em;
      when.textContent = dateFmt.format(new Date(d.atualizado_em));
      const state = document.createElement('span');
      state.className = 'min-w-0 overflow-hidden text-ellipsis';
      state.textContent = stateLabel(d) + (d.descricao ? ' · ' + d.descricao : '');
      sub.append(when, state);
      a.append(h3, sub);
      if (current && current.id === d.id) a.setAttribute('aria-current', 'true');
      li.appendChild(a);
      listEl.appendChild(li);
    });
    if (countEl) countEl.textContent = String(drafts.length);
    ctx.escritos && ctx.escritos.refilter();
  }

  async function load() {
    try {
      const res = await fetch('/api/escritos/rascunhos', { headers: { Accept: 'application/json' } });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data || !data.ok) return;
      drafts = data.escritos || [];
      canPublish = data.publicar === true;
      renderList();
    } catch (_) {
      /* sem rede: a lista fica como estava */
    }
  }

  // ── O editor ───────────────────────────────────────────────────────
  function fill(d) {
    fields.titulo.value = d.titulo || '';
    fields.descricao.value = d.descricao || '';
    fields.slug.value = d.slug || '';
    fields.lang.value = d.lang || ctx.data.lang;
    fields.tags.value = (d.tags || []).join(', ');
    fields.chave.value = d.chave || '';
    fields.corpo.value = d.corpo || '';
  }

  function read() {
    return {
      id: current ? current.id : undefined,
      titulo: fields.titulo.value,
      descricao: fields.descricao.value,
      slug: fields.slug.value.trim().toLowerCase(),
      lang: fields.lang.value,
      tags: fields.tags.value.split(',').map((s) => s.trim()).filter(Boolean),
      chave: fields.chave.value,
      corpo: fields.corpo.value,
    };
  }

  function open(d) {
    current = d;
    dirty = false;
    fill(d);
    ctx.escritos && ctx.escritos.mark(null);
    el.dataset.editing = '1';
    el.dataset.detail = '1';
    renderList();
    say(d.estado === 'publicado' ? t.statusPublished : t.saved);
    if (publishBtn) publishBtn.disabled = !canPublish;
    if (!canPublish) say(t.publishOff);
    fields.titulo.focus();
  }

  async function call(url, body) {
    try {
      const res = await postJson(url, body);
      const data = await res.json().catch(() => ({}));
      return { ok: res.ok && data.ok === true, status: res.status, data };
    } catch (_) {
      return { ok: false, status: 0, data: {} };
    }
  }

  async function save() {
    if (!current || busy) return false;
    clearTimeout(timer);
    busy = true;
    say(t.saving);
    const res = await call('/api/escritos/rascunhos', read());
    busy = false;
    if (!res.ok) {
      say(t.fail);
      return false;
    }
    current = res.data.escrito;
    dirty = false;
    // O servidor pode ter derivado o endereço do título — mostra-se.
    if (!fields.slug.value) fields.slug.value = current.slug || '';
    const i = drafts.findIndex((d) => d.id === current.id);
    if (i >= 0) drafts[i] = current;
    else drafts.unshift(current);
    renderList();
    say(t.saved);
    return true;
  }

  function scheduleSave() {
    dirty = true;
    say(t.unsaved);
    clearTimeout(timer);
    timer = setTimeout(save, SAVE_DELAY);
  }

  async function novo() {
    if (dirty) await save();
    const res = await call('/api/escritos/rascunhos', { titulo: '', lang: ctx.data.lang, tags: [], corpo: '' });
    if (!res.ok) return say(t.fail);
    drafts.unshift(res.data.escrito);
    open(res.data.escrito);
  }

  async function abrir(id) {
    if (current && current.id === id) return;
    if (dirty) await save();
    const d = drafts.find((x) => x.id === id);
    if (d) open(d);
  }

  async function publicar() {
    if (!current || busy) return;
    if (!fields.titulo.value.trim()) return say(t.needsTitle);
    if (dirty && !(await save())) return;
    busy = true;
    if (publishBtn) publishBtn.disabled = true;
    say(t.publishing);
    const res = await call('/api/escritos/publicar', { id: current.id });
    busy = false;
    if (publishBtn) publishBtn.disabled = !canPublish;
    if (!res.ok) return say(res.status === 503 ? t.publishOff : t.fail);
    current = res.data.escrito;
    const i = drafts.findIndex((d) => d.id === current.id);
    if (i >= 0) drafts[i] = current;
    renderList();
    say(t.published);
    ctx.notify(t.published);
  }

  async function apagar() {
    if (!current || busy) return;
    if (!window.confirm(t.confirmDelete)) return;
    clearTimeout(timer);
    const id = current.id;
    const res = await call('/api/escritos/rascunhos/remover', { id });
    if (!res.ok) return say(t.fail);
    drafts = drafts.filter((d) => d.id !== id);
    current = null;
    dirty = false;
    ctx.escritos && ctx.escritos.list(false);
    renderList();
  }

  Object.values(fields).forEach((f) => f.addEventListener('input', scheduleSave));
  // O título é uma linha só, por mais que quebre: Enter vai para o corpo.
  fields.titulo.addEventListener('keydown', (ev) => {
    if (ev.key !== 'Enter') return;
    ev.preventDefault();
    fields.corpo.focus();
  });
  fields.titulo.addEventListener('input', () => {
    if (fields.titulo.value.includes('\n')) fields.titulo.value = fields.titulo.value.replace(/\n+/g, ' ');
  });
  editor.addEventListener('click', (ev) => {
    if (ev.target.closest('[data-editor-publish]')) publicar();
    else if (ev.target.closest('[data-editor-delete]')) apagar();
  });
  // Sair a meio não perde nada: o que estava por guardar vai antes.
  window.addEventListener('pagehide', () => {
    if (dirty && current) navigator.sendBeacon && save();
  });

  ctx.escritosEditor = { isOwner: () => owner, novo, abrir };

  // Acorda só para o dono — e outra vez sempre que a sessão mudar.
  async function wake() {
    owner = await amIOwner();
    el.dataset.owner = owner ? '1' : '0';
    if (owner) load();
  }
  wake();
  const prev = ctx.onSessionChange;
  ctx.onSessionChange = () => {
    prev && prev();
    wake();
  };
}
