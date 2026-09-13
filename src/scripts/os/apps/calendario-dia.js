// ─────────────────────────────────────────────────────────────────────
// O Calendário: a vista de dia, com a forma da do iOS 26.
//
// Em cima a tira da semana — sete iniciais e sete números, o dia
// escolhido num círculo vermelho, e arrasta-se para os lados para mudar
// de semana. Por baixo a data por extenso, e depois a grelha das horas:
// uma etiqueta à esquerda e um traço a atravessar, com os blocos
// posicionados pela hora a que começam e a altura da duração.
//
// A linha do agora — a cápsula vermelha com as horas — só existe quando
// o dia escolhido é hoje. É o JS que decide isso; o CSS só sabe pôr uma
// coisa na altura `--at`.
// ─────────────────────────────────────────────────────────────────────
import { esc } from '../lib/dom.js';
import { project, spring, track } from '../gesture.js';
import { diaDoKey, duracaoHoras, eventosPorDia, horaDe, keyOf, segundaDe, somaDias } from './calendario-dados.js';

/** Quanto o dedo tem de andar (já com o embalo somado) para a semana
 *  mudar. Abaixo disto a tira volta ao sítio. */
const LIMIAR = 46;

export function criarDia(el, t, fmt, state, getHandlers) {
  const strip = el.querySelector('[data-cal-strip]');
  const dateline = el.querySelector('[data-cal-dateline]');
  const hours = el.querySelector('[data-cal-hours]');
  const canvas = el.querySelector('[data-cal-canvas]');

  let ultimoDia = null;
  let animacao = null;

  const hhmm = (iso) => fmt.hora.format(new Date(iso));

  function renderStrip() {
    const escolhido = diaDoKey(state.selected);
    const segunda = segundaDe(escolhido);
    const hoje = keyOf(new Date());
    strip.innerHTML = [0, 1, 2, 3, 4, 5, 6]
      .map((i) => {
        const d = somaDias(segunda, i);
        const k = keyOf(d);
        const classes = 'cal-strip-day' + (k === state.selected ? ' on' : '') + (k === hoje ? ' today' : '');
        return (
          '<button type="button" class="' + classes + '" data-strip-day="' + k + '"' +
          ' aria-label="' + esc(fmt.cap(fmt.dia.format(d))) + '" aria-pressed="' + (k === state.selected) + '">' +
          '<span class="cal-strip-wd">' + esc(fmt.inicial.format(d)) + '</span>' +
          '<span class="cal-strip-n">' + d.getDate() + '</span></button>'
        );
      })
      .join('');
  }

  /** O texto de um bloco: a hora, e o que é. O assunto de uma reunião de
   *  outra pessoa aparece na mesma — o que nunca aparece é o email. */
  function textoDe(ev) {
    if (ev.kind === 'free') return t.free;
    if (ev.kind === 'busy') return t.busy;
    if (ev.kind === 'bloqueio') return ev.note || t.block;
    if (ev.kind === 'abertura') return ev.note || t.opening;
    return ev.title || t.meeting;
  }

  function bloco(ev) {
    const estilo = 'style="--at:' + horaDe(ev.start).toFixed(4) + ';--dur:' + duracaoHoras(ev.start, ev.end).toFixed(4) + '"';
    const dentro = '<b>' + esc(hhmm(ev.start)) + ' – ' + esc(hhmm(ev.end)) + '</b><span>' + esc(textoDe(ev)) + '</span>';
    // Uma hora tomada por outra pessoa não abre nada — não há detalhe
    // nenhum a mostrar a quem não é dono dela. Por isso não é um botão:
    // um botão que não faz nada é pior do que não haver botão.
    if (ev.kind === 'busy') return '<div class="cal-block busy" ' + estilo + '>' + dentro + '</div>';
    const id = ev.kind === 'free' ? ev.start : ev.id;
    return (
      '<button type="button" class="cal-block ' + ev.kind + '" ' + estilo +
      ' data-cal-event="' + esc(String(id)) + '" data-cal-kind="' + ev.kind + '">' +
      dentro + '</button>'
    );
  }

  function renderHoras(lista) {
    const linhas = [];
    for (let h = 0; h < 24; h++) {
      const rotulo = String(h).padStart(2, '0') + ':00';
      linhas.push('<div class="cal-hr" style="--at:' + h + '" aria-hidden="true"><span>' + rotulo + '</span><i></i></div>');
    }
    const blocos = lista.map(bloco);
    if (!blocos.length) {
      blocos.push('<div class="cal-block cal-nota" style="--at:9;--dur:1"><span>' + esc(t.nothing) + '</span></div>');
    }
    canvas.innerHTML = linhas.join('') + blocos.join('') + linhaDoAgora();
  }

  function linhaDoAgora() {
    if (state.selected !== keyOf(new Date())) return '';
    const agora = new Date();
    return (
      '<div class="cal-now" style="--at:' + horaDe(agora.toISOString()).toFixed(4) + '" aria-hidden="true" data-cal-now>' +
      '<b>' + esc(fmt.hora.format(agora)) + '</b><i></i></div>'
    );
  }

  /** Rolar começa perto da hora actual (ou do primeiro acontecimento do
   *  dia), não à meia-noite — ninguém marca reuniões às três da manhã. */
  function posicionar(lista) {
    if (ultimoDia === state.selected) return;
    ultimoDia = state.selected;
    const hoje = state.selected === keyOf(new Date());
    const alvo = hoje ? horaDe(new Date().toISOString()) : lista.length ? horaDe(lista[0].start) : 9;
    const altura = parseFloat(getComputedStyle(el).getPropertyValue('--cal-hour')) || 52;
    hours.scrollTop = Math.max(0, (alvo - 1.5) * altura);
  }

  function render() {
    renderStrip();
    const d = diaDoKey(state.selected);
    dateline.textContent = fmt.cap(fmt.longo.format(d));
    const lista = eventosPorDia(state).get(state.selected) || [];
    renderHoras(lista);
    posicionar(lista);
  }

  // ── O gesto da tira ────────────────────────────────────────────────
  // Uma semana para cada lado. Passa por `track` (gesture.js) e não por
  // `pointermove` à mão: é daí que vêm a captura, o eixo e o embalo.
  function wire() {
    track(
      strip,
      {
        begin: () => {
          if (animacao) animacao.cancel();
        },
        move: (g) => {
          strip.style.transform = 'translateX(' + g.dx + 'px)';
        },
        end: (g) => {
          const ida = g.dx + project(g.vx);
          const passo = ida <= -LIMIAR ? 7 : ida >= LIMIAR ? -7 : 0;
          animacao = spring(g.dx, 0, g.vx, (v) => (strip.style.transform = 'translateX(' + v + 'px)'));
          if (passo) getHandlers().selectDay(keyOf(somaDias(diaDoKey(state.selected), passo)));
        },
      },
      { axis: 'x', threshold: 10 }
    );

    // A linha do agora anda com o relógio. Um minuto de intervalo é o
    // que a app da Apple usa, e só se toca no estilo se ela existir.
    setInterval(() => {
      const linha = canvas.querySelector('[data-cal-now]');
      if (!linha) return;
      const agora = new Date();
      linha.style.setProperty('--at', horaDe(agora.toISOString()).toFixed(4));
      linha.firstElementChild.textContent = fmt.hora.format(agora);
    }, 60000);
  }

  return { render, wire };
}
