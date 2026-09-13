// ─────────────────────────────────────────────────────────────────────
// O Calendário: as contas com datas, sem nada que desenhe.
//
// Está à parte porque as três vistas (mês, dia, folhas) precisam todas
// das mesmas respostas — a que dia local pertence este instante, o que
// acontece nesse dia, quantas horas dura isto — e duas cópias da mesma
// conta é como um mês e um dia acabam a discordar um do outro.
//
// O servidor fala sempre em UTC e manda o instante ISO; o fuso é de
// quem vê. Por isso tudo aqui usa o relógio local do browser, sem lhe
// dizer `timeZone` nenhum: é essa omissão que faz o Calendário mostrar
// as horas de quem está a olhar.
// ─────────────────────────────────────────────────────────────────────

const pad = (n) => String(n).padStart(2, '0');

/** O dia local de uma data, como 'YYYY-MM-DD'. */
export const keyOf = (d) => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());

/** O dia local a que um instante pertence. */
export const keyOfIso = (iso) => keyOf(new Date(iso));

/** Uma chave de dia de volta a uma data. Ao meio-dia, de propósito: nos
 *  dias em que o horário de verão muda, a meia-noite pode não existir. */
export const diaDoKey = (key) => new Date(key + 'T12:00:00');

/** Que fracção do dia já passou, em horas — 14:30 é 14,5. É isto que
 *  põe um bloco no sítio certo da grelha das horas. */
export function horaDe(iso) {
  const d = new Date(iso);
  return d.getHours() + d.getMinutes() / 60;
}

export const duracaoHoras = (start, end) => Math.max(0.25, (new Date(end) - new Date(start)) / 3600000);

export const somaDias = (d, n) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);

/** A segunda-feira da semana de uma data — a semana começa à segunda,
 *  como no calendário português. */
export const segundaDe = (d) => somaDias(d, -((d.getDay() + 6) % 7));

/**
 * Um período partido pelas meias-noites locais que atravessa. Um
 * bloqueio de férias tem de aparecer em todos os dias que ocupa, não só
 * no primeiro — e cada pedaço tem de caber na grelha do seu dia.
 */
export function fatiasPorDia(startIso, endIso) {
  const out = [];
  let cur = new Date(startIso);
  const fim = new Date(endIso);
  let guarda = 0;
  while (cur < fim && guarda++ < 80) {
    const meiaNoite = new Date(cur.getFullYear(), cur.getMonth(), cur.getDate() + 1);
    const ate = meiaNoite < fim ? meiaNoite : fim;
    out.push({ key: keyOf(cur), start: cur.toISOString(), end: ate.toISOString() });
    cur = ate;
  }
  return out;
}

/**
 * Tudo o que acontece, dia a dia. A chave é o dia local; o valor é a
 * lista ordenada do que lá está.
 *
 * Seis tipos, e cada um lê-se diferente no ecrã:
 *   free      um horário livre, que se pode marcar
 *   mine      uma reunião minha
 *   busy      uma hora tomada por outra pessoa — sem dizer por quem
 *   meeting   uma reunião de outra pessoa — só o dono recebe estas
 *   bloqueio  um período que o dono tirou
 *   abertura  um período que o dono deu a mais
 */
export function eventosPorDia(state) {
  const mapa = new Map();
  const junta = (key, ev) => mapa.set(key, (mapa.get(key) || []).concat(ev));

  const passo = (state.minutes || 30) * 60000;
  state.slots.forEach((iso) => {
    junta(keyOfIso(iso), { kind: 'free', start: iso, end: new Date(new Date(iso).getTime() + passo).toISOString() });
  });

  // O dono recebe a agenda cheia; toda a gente recebe só as suas. Onde
  // as duas se cruzam (uma reunião que o próprio dono marcou) vale a da
  // agenda cheia, que é a que traz o email — daí o `Set` de ids.
  const meus = new Set(state.mine.map((m) => m.id));
  state.todas.forEach((m) => {
    junta(keyOfIso(m.start), { ...m, kind: meus.has(m.id) ? 'mine' : 'meeting' });
  });
  state.mine.forEach((m) => {
    if (!state.todas.some((x) => x.id === m.id)) junta(keyOfIso(m.start), { ...m, kind: 'mine' });
  });

  // Ao dono não se acrescentam estas: `todas` já traz as mesmas horas,
  // e com o nome de quem lá está. Seriam duas caixas em cima uma da outra.
  if (!state.owner) {
    state.busy.forEach((b) => junta(keyOfIso(b.start), { ...b, kind: 'busy' }));
  }

  state.overrides.forEach((o) => {
    fatiasPorDia(o.start, o.end).forEach((f) => junta(f.key, { ...o, kind: o.kind, start: f.start, end: f.end }));
  });

  mapa.forEach((lista) => lista.sort((a, b) => (a.start < b.start ? -1 : 1)));
  return mapa;
}

/** A ordem por que os pontos do mês se escolhem quando não cabem todos:
 *  o que está marcado conta mais do que o que está livre. */
const PESO = { mine: 0, meeting: 1, busy: 2, bloqueio: 3, abertura: 4, free: 5 };

/** Os pontos de um dia, no máximo quatro — o que a app da Apple mostra
 *  antes de deixar de caber. */
export function pontosDoDia(lista) {
  return [...lista].sort((a, b) => PESO[a.kind] - PESO[b.kind]).slice(0, 4);
}
