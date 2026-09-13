// ─────────────────────────────────────────────────────────────────────
// O Calendário: o estado, e a conversa com o servidor.
//
// Quatro coisas a saber a cada momento: quem está com sessão (e se é o
// dono), que mês se vê, que dia está escolhido, e o que há nesse
// intervalo. Tudo o que desenha está nos três ficheiros ao lado —
// calendario-vista.js (o mês), calendario-dia.js e calendario-folhas.js.
//
// Quem vê, vê o quê:
//   sem sessão   nada. O servidor responde 401 e aqui abre-se o painel
//                de entrar, não uma grelha vazia.
//   com sessão   os horários livres, e as SUAS reuniões. As dos outros
//                não chegam sequer ao browser — a hora simplesmente
//                deixa de estar livre.
//   o dono       a agenda cheia (com quem marcou, o assunto e a nota) e
//                os bloqueios e aberturas, que cria e remove.
//
// Entrar não tem ecrã próprio: usa o painel "Entrar" do sistema (ver
// lib/entrar.js), e `ctx.onSessionChange` chama `refresh()` depois de
// uma sessão nova — pelo painel ou de volta de um magic link
// (lib/retomar.js).
// ─────────────────────────────────────────────────────────────────────
import { postJson } from '../lib/session.js';
import { capturar } from '../lib/retomar.js';
import { keyOf } from './calendario-dados.js';
import { createView } from './calendario-vista.js';

// O fuso de quem marca — vai no pedido, para o email de confirmação
// dela usar a mesma hora que ela viu no ecrã, não a de Lisboa.
const visitorTz = Intl.DateTimeFormat().resolvedOptions().timeZone;

export function initCalendario(ctx) {
  const el = ctx.contentNode('calendario');
  if (!el) return;
  const t = ctx.data.strings.calendario;

  const hoje = new Date();
  const state = {
    email: null,
    owner: false,
    enabled: true,
    month: new Date(hoje.getFullYear(), hoje.getMonth(), 1),
    selected: keyOf(hoje),
    slots: [],
    mine: [],
    busy: [],
    todas: [],
    overrides: [],
    minutes: 30,
    view: 'month',
  };

  const view = createView(el, t, ctx, state);

  /**
   * Do primeiro ao último dia do mês à vista — com um dia de folga de
   * cada lado. Os horários vêm do servidor em UTC e mostram-se no fuso
   * de quem os vê: perto da meia-noite, um horário pode cair no dia
   * anterior ou seguinte do calendário de Lisboa mas no deste mês (ou
   * vice-versa). A folga garante que esse horário chega, mesmo que
   * apareça numa célula "fora do mês" na grelha.
   */
  function range() {
    const from = new Date(state.month.getFullYear(), state.month.getMonth(), 0);
    const to = new Date(state.month.getFullYear(), state.month.getMonth() + 1, 1);
    return { from: keyOf(from), to: keyOf(to) };
  }

  /** Sem sessão não há nada para ver: guarda-se o sítio e abre-se o
   *  painel de entrar, como as outras apps do sistema fazem. */
  function pedirSessao() {
    state.email = null;
    state.owner = false;
    limpar();
    view.render();
    capturar(ctx);
    ctx.entrar.open();
  }

  function limpar() {
    state.slots = [];
    state.mine = [];
    state.busy = [];
    state.todas = [];
    state.overrides = [];
  }

  const ler = (url) => fetch(url, { headers: { Accept: 'application/json' } });

  async function loadMonth(convidar) {
    if (!state.email) {
      limpar();
      view.render();
      if (convidar) pedirSessao();
      return;
    }
    const { from, to } = range();
    try {
      const res = await ler('/api/reunioes/disponibilidade?from=' + from + '&to=' + to);
      if (res.status === 401) return pedirSessao();
      if (res.ok) {
        const data = await res.json();
        state.slots = data.slots || [];
        state.mine = data.mine || [];
        state.busy = data.busy || [];
        state.minutes = data.minutes || 30;
      }
      if (state.owner) await loadOwner(from, to);
    } catch (_) {
      ctx.notify(t.errors.generic);
    }
    view.render();
  }

  /** A agenda cheia e as alterações de disponibilidade. Só o dono passa
   *  o portão do servidor; se alguma vez não passar, fica sem estes dois
   *  e o resto do Calendário continua a funcionar. */
  async function loadOwner(from, to) {
    const [agenda, blocos] = await Promise.all([
      ler('/api/reunioes/todas?from=' + from + '&to=' + to).then((r) => (r.ok ? r.json() : null)).catch(() => null),
      ler('/api/reunioes/bloqueios').then((r) => (r.ok ? r.json() : null)).catch(() => null),
    ]);
    state.todas = (agenda && agenda.meetings) || [];
    state.overrides = (blocos && blocos.overrides) || [];
  }

  async function whoAmI() {
    try {
      const res = await ler('/api/auth/me');
      const data = await res.json().catch(() => ({}));
      state.enabled = data.enabled !== false;
      state.email = res.ok && data.ok ? data.email : null;
      state.owner = data.owner === true;
    } catch (_) {
      state.email = null;
      state.owner = false;
    }
  }

  const failure = (res, data) =>
    res.status === 429 ? t.errors.limit : res.status === 503 ? t.errors.off : res.status === 403 ? t.errors.owner : data.error === 'email' ? t.errors.email : t.errors.generic;

  // ── Marcar e desmarcar ─────────────────────────────────────────────
  async function book(start, title, note) {
    view.sheetHint(t.sending);
    try {
      const res = await postJson('/api/reunioes', { start, title, note, lang: ctx.data.lang, tz: visitorTz });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.ok) {
        view.closeSheet();
        ctx.notify(t.booked);
        await loadMonth();
      } else view.sheetHint(res.status === 409 ? t.errors.taken : failure(res, data));
    } catch (_) {
      view.sheetHint(t.errors.generic);
    }
  }

  /** `doDono` diz qual das duas rotas serve: a de quem marcou exige que
   *  a sessão seja a dela, e é isso que protege as reuniões umas das
   *  outras — desmarcar a de outra pessoa é um poder à parte. */
  async function cancelMeeting(id, doDono) {
    try {
      const res = await postJson(doDono ? '/api/reunioes/desmarcar' : '/api/reunioes/cancelar', { id });
      if (res.ok) ctx.notify(t.cancelled);
    } catch (_) {
      ctx.notify(t.errors.generic);
    }
    await loadMonth();
  }

  // ── Disponibilidade, só do dono ────────────────────────────────────
  async function addOverride(kind, start, end, note) {
    try {
      const res = await postJson('/api/reunioes/bloqueios', { kind, start, end, note });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.ok) {
        view.closeSheet();
        ctx.notify(t.blockCreated);
        await loadMonth();
      } else view.blockHint(data.error === 'intervalo' ? t.errors.interval : failure(res, data));
    } catch (_) {
      view.blockHint(t.errors.generic);
    }
  }

  async function removeOverride(id) {
    try {
      const res = await postJson('/api/reunioes/bloqueios/remover', { id });
      if (res.ok) ctx.notify(t.blockRemoved);
    } catch (_) {
      ctx.notify(t.errors.generic);
    }
    await loadMonth();
  }

  /** Escolher um dia pode trazer outro mês atrás — as setas do teclado e
   *  a tira da semana atravessam a fronteira sem pedir licença. */
  function selectDay(key) {
    state.selected = key;
    const mes = new Date(key + 'T12:00:00');
    if (mes.getMonth() === state.month.getMonth() && mes.getFullYear() === state.month.getFullYear()) {
      view.render();
      return Promise.resolve();
    }
    state.month = new Date(mes.getFullYear(), mes.getMonth(), 1);
    return loadMonth();
  }

  view.wire({
    prev: () => {
      state.month = new Date(state.month.getFullYear(), state.month.getMonth() - 1, 1);
      loadMonth();
    },
    next: () => {
      state.month = new Date(state.month.getFullYear(), state.month.getMonth() + 1, 1);
      loadMonth();
    },
    today: () => {
      const agora = new Date();
      state.month = new Date(agora.getFullYear(), agora.getMonth(), 1);
      state.selected = keyOf(agora);
      loadMonth();
    },
    pick: (key) => {
      state.selected = key;
      state.view = 'day';
      selectDay(key);
    },
    selectDay,
    setView: (v) => {
      state.view = v;
      view.render();
    },
    signIn: () => {
      capturar(ctx);
      ctx.entrar.open();
    },
    book,
    cancelMeeting,
    addOverride,
    removeOverride,
  });

  ctx.calendario = {
    // Depois de entrar (painel global, ou o retomar de um magic link) a
    // sessão já existe mas o estado aqui ainda não sabe — refaz-se do
    // zero, como no primeiro arranque da app.
    refresh: async () => {
      await whoAmI();
      await loadMonth();
    },
  };

  let prepared = false;
  ctx.prepareCalendar = async () => {
    if (prepared) return;
    prepared = true;
    await whoAmI();
    // `convidar` só na primeira abertura: abrir o painel de entrar é o
    // que se quer de quem veio ver a agenda sem sessão, não de quem
    // acabou de sair de propósito.
    await loadMonth(true);
  };

  view.render();
}
