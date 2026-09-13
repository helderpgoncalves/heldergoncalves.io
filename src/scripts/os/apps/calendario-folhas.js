// ─────────────────────────────────────────────────────────────────────
// O Calendário: as folhas que se abrem por cima.
//
// Três, e cada uma responde a um toque:
//   marcar    tocou-se num horário livre
//   detalhe   tocou-se numa reunião, num bloqueio ou numa abertura
//   bloco     o dono carregou no botão de criar (só ele o vê)
//
// A regra que não se quebra passa por aqui: o email de quem marcou só
// se escreve no detalhe **se quem está a ver for o dono**. O servidor já
// só o manda ao dono (`/api/reunioes/todas`); esta é a segunda fechadura,
// para uma resposta futura que traga a mais não o deixar sair no ecrã.
// ─────────────────────────────────────────────────────────────────────
import { esc } from '../lib/dom.js';

// O fuso de quem está a ver — o mesmo que o servidor não escolhe por
// ninguém. Vai escrito na folha de marcar, para não haver dúvida sobre
// que relógio é aquele.
const fusoDeQuemVe = Intl.DateTimeFormat().resolvedOptions().timeZone;

export function criarFolhas(el, t, fmt, state, getHandlers) {
  const sheet = el.querySelector('[data-cal-sheet]');
  const form = el.querySelector('[data-cal-book]');
  const when = el.querySelector('[data-cal-when]');
  const hint = el.querySelector('[data-cal-hint]');
  const detail = el.querySelector('[data-cal-detail]');
  const card = el.querySelector('[data-cal-detail-card]');
  const bloco = el.querySelector('[data-cal-block]');
  const blocoForm = el.querySelector('[data-cal-block-form]');
  const blocoHint = el.querySelector('[data-cal-block-hint]');

  let pendingStart = null;

  const hhmm = (iso) => fmt.hora.format(new Date(iso));
  const porExtenso = (iso) => fmt.cap(fmt.longo.format(new Date(iso)));

  function fechar() {
    sheet.hidden = true;
    detail.hidden = true;
    bloco.hidden = true;
    pendingStart = null;
  }

  const aviso = (texto) => (hint.textContent = texto || '');

  // ── Marcar ─────────────────────────────────────────────────────────
  function abrirMarcar(iso) {
    pendingStart = iso;
    when.textContent =
      porExtenso(iso) + ' · ' + hhmm(iso) + '\n' + t.tz + ' (' + fusoDeQuemVe + ') · ' + state.minutes + ' ' + t.minutes;
    form.reset();
    aviso('');
    sheet.hidden = false;
    setTimeout(() => form.querySelector('input').focus(), 30);
  }

  // ── Detalhe ────────────────────────────────────────────────────────
  const linha = (chave, valor) =>
    valor ? '<div class="cal-det-row"><b>' + esc(chave) + '</b><span>' + esc(valor) + '</span></div>' : '';

  /** O que se sabe deste id, sem voltar ao servidor: o estado já tem
   *  tudo o que o servidor mandou, e mandou só o que se pode ver. */
  function procurar(id, kind) {
    if (kind === 'bloqueio' || kind === 'abertura') return state.overrides.find((o) => o.id === id) || null;
    return state.todas.find((m) => m.id === id) || state.mine.find((m) => m.id === id) || null;
  }

  function abrirEvento(id, kind) {
    if (kind === 'free') return abrirMarcar(id);
    const ev = procurar(id, kind);
    if (!ev) return;
    const titulo = kind === 'bloqueio' ? t.block : kind === 'abertura' ? t.opening : ev.title || t.meeting;
    const acoes =
      kind === 'bloqueio' || kind === 'abertura'
        ? state.owner
          ? '<button type="button" class="btn" data-cal-drop-block="' + esc(ev.id) + '">' + esc(t.remove) + '</button>'
          : ''
        : '<button type="button" class="btn" data-cal-cancel="' + esc(ev.id) + '" data-cal-kind="' + kind + '">' + esc(t.cancelMeeting) + '</button>';

    card.innerHTML =
      '<h3 class="m-0 text-[length:var(--t-title2)] font-bold tracking-[-0.02em]">' + esc(titulo) + '</h3>' +
      '<p class="m-0 text-[length:var(--t-subhead)] text-(--ink-2)">' + esc(porExtenso(ev.start)) + '</p>' +
      '<p class="m-0 mb-1 text-[length:var(--t-subhead)] font-semibold tabular-nums text-(--ink)">' + esc(hhmm(ev.start)) + ' – ' + esc(hhmm(ev.end)) + '</p>' +
      // Só o dono. Um visitante nunca recebe este campo do servidor, e
      // mesmo que recebesse não o veria escrito aqui.
      (state.owner ? linha(t.who, ev.email) : '') +
      linha(t.noteLabel, ev.note) +
      '<div class="btn-row mt-3 justify-end">' +
      acoes +
      '<button type="button" class="btn btn-primary" data-cal-close>' + esc(t.close) + '</button></div>';
    detail.hidden = false;
  }

  // ── Bloqueio ou abertura (só o dono) ───────────────────────────────
  /** 'YYYY-MM-DDTHH:MM' no relógio de quem está a ver — o formato que o
   *  `datetime-local` aceita, e o mesmo fuso em que ele devolve. */
  function paraCampo(d) {
    const p = (n) => String(n).padStart(2, '0');
    return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()) + 'T' + p(d.getHours()) + ':' + p(d.getMinutes());
  }

  function abrirBloco() {
    const base = new Date(state.selected + 'T09:00:00');
    blocoForm.reset();
    blocoForm.start.value = paraCampo(base);
    blocoForm.end.value = paraCampo(new Date(state.selected + 'T18:00:00'));
    blocoHint.textContent = '';
    bloco.hidden = false;
  }

  const avisoBloco = (texto) => (blocoHint.textContent = texto || '');

  // ── Os cliques que são das folhas ──────────────────────────────────
  // Chamado pelo listener único da vista, no fim — depois de nenhuma
  // das outras coisas ter respondido pelo clique.
  function cliqueNaFolha(ev) {
    const cancel = ev.target.closest('[data-cal-cancel]');
    if (cancel) {
      fechar();
      return getHandlers().cancelMeeting(cancel.dataset.calCancel, cancel.dataset.calKind === 'meeting');
    }
    const drop = ev.target.closest('[data-cal-drop-block]');
    if (drop) {
      fechar();
      return getHandlers().removeOverride(drop.dataset.calDropBlock);
    }
    if (ev.target.closest('[data-cal-close]') || ev.target === sheet || ev.target === detail || ev.target === bloco) fechar();
  }

  el.addEventListener('submit', (ev) => {
    ev.preventDefault();
    if (ev.target === form && pendingStart) {
      getHandlers().book(pendingStart, form.title.value.trim(), form.note.value.trim());
      return;
    }
    if (ev.target !== blocoForm) return;
    const inicio = new Date(blocoForm.start.value);
    const fim = new Date(blocoForm.end.value);
    if (!(fim > inicio)) return avisoBloco(t.errors.interval);
    avisoBloco(t.sending);
    getHandlers().addOverride(blocoForm.kind.value, inicio.toISOString(), fim.toISOString(), blocoForm.note.value.trim());
  });

  return { abrirEvento, abrirBloco, cliqueNaFolha, fechar, aviso, avisoBloco };
}
