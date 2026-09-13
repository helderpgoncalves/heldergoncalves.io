// ─────────────────────────────────────────────────────────────────────
// O resumo do ano: o que já faturei, o que falta faturar, e o que disso
// não é meu.
//
// A ordem é a da pergunta que se faz ao abrir isto — é a lógica do
// recibo, não a de um livro de contas. O faturado e o recebido em
// grande, a variação contra o objetivo na cápsula, o gráfico dos meses,
// e depois os azulejos do que não é nosso.
//
// **Cada azulejo abre e diz a conta que fez.** É a regra que separa
// isto de uma declaração fiscal: um total que não se consegue explicar
// não se mostra (docs/arquitetura.md). O servidor manda a taxa e a base
// com cada número; aqui só se escreve a frase à volta.
//
// O gráfico é o mesmo `chart()` das cotações, e a cápsula é a mesma
// `PILL` da lista: a face financeira é a Bolsa a falar de dinheiro.
// ─────────────────────────────────────────────────────────────────────
import { esc } from '../lib/dom.js';
import { INK, PILL, PILL_CLASS, chart, wireChart } from './bolsa-grafico.js';
import { BOTAO, camposTaxas, formaHtml, lerForma } from './financas-forma.js';

export function createFinResumo(ctx, fmt) {
  const t = ctx.data.strings.financas;

  /** Um azulejo de estatística — o mesmo `.stk-stats-item` das cotações
      — com a conta por baixo, fechada até alguém querer saber. */
  function azulejo(rotulo, valor, como) {
    return (
      '<div class="stk-stats-item bg-(--surface-2) px-3 py-2.5">' +
      '<dt class="text-[length:var(--t-caption)] text-(--ink-3)">' + esc(rotulo) + '</dt>' +
      '<dd class="mt-0.5 mb-0 text-[length:var(--t-body)] font-semibold tabular-nums">' + esc(valor) + '</dd>' +
      (como
        ? '<details class="fin-how mt-1.5"><summary class="cursor-default list-none text-[length:var(--t-caption)] font-medium text-(--accent)">' + esc(t.howLabel) + '</summary>' +
          '<p class="m-0 mt-1 text-[length:var(--t-caption)] leading-[1.45] text-(--ink-3)">' + esc(como) + '</p></details>'
        : '') +
      '</div>'
    );
  }

  function azulejos(d) {
    const r = d.resumo;
    const ss = d.seguranca_social;
    const irs = d.irs;
    const p = d.previsao;
    const iva = r.iva.isento
      ? fmt.fill(t.how.ivaExempt, { motivo: (d.taxas && d.taxas.iva_motivo) || '' })
      : fmt.fill(t.how.iva, { taxa: fmt.taxa(r.iva.taxa), base: fmt.moeda(r.iva.sobre) });
    return (
      azulejo(t.tiles.iva, fmt.moeda(r.iva.valor), iva) +
      azulejo(t.tiles.retido, fmt.moeda(r.retido.valor), fmt.fill(t.how.retido, { taxa: fmt.taxa(r.retido.taxa), base: fmt.moeda(r.retido.sobre) })) +
      azulejo(
        t.tiles.ss,
        fmt.moeda(ss.valor.valor),
        ss.isento
          ? t.how.ssExempt
          : fmt.fill(t.how.ss, {
              taxa: fmt.taxa(ss.valor.taxa),
              relevante: fmt.moeda(ss.relevante.valor),
              fracao: fmt.taxa(ss.relevante.taxa),
              base: fmt.moeda(ss.faturado),
              trimestre: ss.base_trimestre,
              ano: ss.base_ano,
            })
      ) +
      azulejo(t.tiles.forecast, fmt.moeda(p.total), fmt.fill(t.how.forecast, { contratado: fmt.moeda(p.contratado), previsto: fmt.moeda(p.previsto) })) +
      azulejo(
        t.tiles.irs,
        fmt.moeda(irs.imposto),
        fmt.fill(t.how.irs, {
          coef: fmt.taxa(irs.rendimento.taxa),
          base: fmt.moeda(irs.rendimento.sobre),
          rendimento: fmt.moeda(irs.rendimento.valor),
          retido: fmt.moeda(irs.retido),
        }) + ' ' + irs.degraus.map((g) => fmt.fill(t.how.irsStep, { taxa: fmt.taxa(g.taxa), valor: fmt.moeda(g.sobre) })).join(' + ')
      )
    );
  }

  /** As faturas em atraso. Não é uma secção como as outras: é o número
      que decide o mês de quem trabalha por conta própria, e por isso
      salta à vista mesmo quando é zero. */
  function emAtraso(d, dados) {
    const r = d.resumo.atraso;
    if (!r.faturas)
      return '<p class="m-0 text-[length:var(--t-foot)] text-(--ink-3)">' + esc(t.noOverdue) + '</p>';
    const nomes = new Map(((dados && dados.clientes) || []).map((c) => [c.id, c.nome]));
    const linhas = ((dados && dados.faturas) || []).filter((f) => f.estado === 'atraso');
    return (
      '<section class="grid gap-1.5 border-l-2 border-(--red) bg-(--surface-2) px-3 py-2.5">' +
      '<h3 class="m-0 text-[length:var(--t-headline)] font-bold tracking-[-0.01em] text-(--red)">' + esc(t.overdue) + '</h3>' +
      '<p class="m-0 text-[length:var(--t-title2)] font-bold tabular-nums text-(--red)">' + esc(fmt.moeda(r.valor)) + '</p>' +
      '<p class="m-0 text-[length:var(--t-caption)] text-(--ink-3)">' + esc(fmt.fill(t.overdueCount, { n: r.faturas })) + '</p>' +
      '<ul class="m-0 grid list-none gap-1 p-0">' +
      linhas
        .map(
          (f) =>
            '<li class="flex flex-wrap items-baseline justify-between gap-x-3 text-[length:var(--t-foot)]">' +
            '<span class="min-w-0 overflow-hidden text-ellipsis whitespace-nowrap">' + esc((nomes.get(f.cliente) || '—') + (f.numero ? ' · ' + f.numero : '')) + '</span>' +
            '<span class="tabular-nums font-semibold">' + esc(fmt.moeda(f.receber)) + '</span></li>'
        )
        .join('') +
      '</ul></section>'
    );
  }

  function grafico(d) {
    // O eixo do tempo é o ano inteiro, mesmo com meses ainda por
    // acontecer — como a sessão inteira no gráfico do dia.
    const pontos = d.resumo.meses.map((m) => [Date.UTC(d.resumo.ano, m.mes - 1, 1) / 1000, m.faturado]);
    const k = d.resumo.variacao == null ? 'flat' : d.resumo.variacao >= 0 ? 'up' : 'down';
    return { pontos, k, html: chart(pontos, k, { range: '1y', locale: ctx.data.intlLocale }) };
  }

  function render(main, d, dados, api, recarregar) {
    if (!main) return;
    if (!d || !d.ok) {
      main.innerHTML = '<div class="grid h-full place-content-center px-6 text-center text-(--ink-3)"><p>' + esc(t.unavailable) + '</p></div>';
      return;
    }
    const r = d.resumo;
    const g = grafico(d);
    const k = g.k;

    main.innerHTML =
      '<div class="fin-panel grid grid-cols-[minmax(0,1fr)] gap-4.5 px-6.5 pb-7.5 pt-5.5 @max-[560px]/app:gap-4 @max-[560px]/app:px-4.5 @max-[380px]/app:px-3.5">' +
      '<header class="flex items-start justify-between gap-4 @max-[560px]/app:flex-wrap @max-[560px]/app:gap-1">' +
      '<div class="min-w-0"><h2 class="m-0 text-[length:var(--t-title)] font-bold tracking-[-0.02em]">' + esc(t.year) + '</h2>' +
      '<p class="mb-0 mt-0.5 text-[length:var(--t-subhead)] text-(--ink-3)">' + esc(String(r.ano)) + ' · ' + esc(t.invoiced) + '</p></div>' +
      '<div class="grid justify-items-end gap-0.5 @max-[560px]/app:justify-items-start">' +
      '<span class="text-[length:var(--t-large)] font-bold tracking-[-0.02em] tabular-nums" data-fin-grande>' + esc(fmt.moeda(r.faturado)) + '</span>' +
      '<span class="' + PILL_CLASS + PILL[k] + '">' + esc(r.variacao == null ? '—' : fmt.pontos(r.variacao)) + '</span>' +
      '<span class="text-[length:var(--t-caption)] text-(--ink-3)">' +
      esc(r.objetivo ? fmt.fill(t.ofGoal, { n: fmt.moeda(r.objetivo) }) : t.noGoal) + '</span></div></header>' +
      // Faturado e recebido são duas colunas e nunca se somam na mesma:
      // mostrar só o faturado é mentir sobre o dinheiro que existe.
      '<div class="grid grid-cols-[repeat(auto-fit,minmax(150px,1fr))] gap-2.5">' +
      '<div class="stk-stats-item bg-(--surface-2) px-3 py-2.5"><p class="m-0 text-[length:var(--t-caption)] text-(--ink-3)">' + esc(t.received) + '</p>' +
      '<p class="m-0 mt-0.5 text-[length:var(--t-title2)] font-bold tabular-nums ' + INK.up + '">' + esc(fmt.moeda(r.recebido)) + '</p>' +
      '<p class="m-0 mt-1 text-[length:var(--t-caption)] leading-[1.45] text-(--ink-3)">' + esc(t.receivedNote) + '</p></div>' +
      '</div>' +
      '<div class="stk-chart relative" data-fin-chart>' + g.html + '</div>' +
      '<dl class="stk-stats m-0 grid grid-cols-[repeat(auto-fit,minmax(150px,1fr))] gap-2.5">' + azulejos(d) + '</dl>' +
      emAtraso(d, dados) +
      '<details class="fin-how"><summary class="cursor-default list-none text-[length:var(--t-subhead)] font-medium text-(--accent)">' + esc(t.rates) + '</summary>' +
      '<p class="m-0 mb-2 mt-1.5 text-[length:var(--t-caption)] text-(--ink-3)">' + esc(t.ratesLead) + '</p>' +
      formaHtml('', camposTaxas(t, d.taxas), '<button type="submit" class="' + BOTAO + '">' + esc(t.save) + '</button>', 'fin-taxas') +
      '</details>' +
      '<p class="m-0 text-[length:var(--t-caption)] text-(--ink-3)">' + esc(t.disclaimer) + '</p>' +
      '</div>';

    // O cursor do gráfico diz o mês por baixo do dedo, no sítio do
    // número grande — como o preço de um instante na app das cotações.
    const grande = main.querySelector('[data-fin-grande]');
    const base = fmt.moeda(r.faturado);
    wireChart(main.querySelector('[data-fin-chart]'), g.pontos, { range: '1y', locale: ctx.data.intlLocale }, (ponto) => {
      if (grande) grande.textContent = ponto ? fmt.moeda(ponto[1]) : base;
    });

    const forma = main.querySelector('[data-fin-forma]');
    if (forma)
      forma.addEventListener('submit', async (ev) => {
        ev.preventDefault();
        const res = await api.taxas(lerForma(forma));
        const corpo = await res.json().catch(() => ({}));
        if (!res.ok || !corpo.ok) return ctx.notify(t.errors[corpo.error] || t.errors.generic);
        recarregar();
      });
  }

  return { render };
}
