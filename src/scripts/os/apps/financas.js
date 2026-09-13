// ─────────────────────────────────────────────────────────────────────
// As Finanças: a terceira face da Bolsa, ao lado da Lista e do
// Portefólio. **Só do dono.**
//
// É a mesma app a falar de dinheiro em vez de cotações, e por isso
// reaproveita tudo o que já lá está: as linhas da lista, as cápsulas de
// variação, os azulejos de estatística e o mesmo gráfico. O painel da
// direita é o mesmo — pede-se por `ctx.bolsa`, nunca por importação
// directa (ver .claude/rules/cliente.md).
//
// A face nasce escondida em Bolsa.astro e só se revela depois de
// `/api/auth/me` dizer que a sessão é a do dono. Isto é a camada
// visual: o portão a sério é `require_owner`, no servidor, e recusa
// estas rotas a toda a gente menos a ele.
//
// **Tudo o que é fiscal é estimativa**, e cada número diz de onde veio.
// Ver financas-resumo.js, que é onde essa conta se escreve.
// ─────────────────────────────────────────────────────────────────────
import { esc } from '../lib/dom.js';
import { amIOwner, postJson } from '../lib/session.js';
import { PILL, PILL_CLASS } from './bolsa-grafico.js';
import { createFinResumo } from './financas-resumo.js';
import { createFinDetalhe } from './financas-detalhe.js';

export function initFinancas(ctx) {
  const el = ctx.contentNode('bolsa');
  if (!el) return;
  const grupo = el.querySelector('[data-fin-group]');
  const lista = el.querySelector('[data-fin-list]');
  if (!grupo || !lista) return;
  const t = ctx.data.strings.financas;

  let dono = false;
  let dados = null; // clientes, projetos, fases, avenças, faturas, taxas
  let resumo = null; // o ano com as contas feitas, do servidor
  let ano = new Date().getFullYear();
  let aberto = null; // 'resumo', ou o id de um cliente

  // ── Dinheiro nunca se formata à mão ────────────────────────────────
  // A moeda vem do servidor e a língua de quem vê vem do sistema: é o
  // `Intl` que decide se leva vírgula ou ponto, e de que lado fica o
  // símbolo. Escrever `valor + ' €'` era acertar em Portugal e errar em
  // todo o lado onde alguém abrisse isto.
  const fmt = {
    moeda: (cents) =>
      new Intl.NumberFormat(ctx.data.intlLocale, {
        style: 'currency',
        currency: (dados && dados.moeda) || 'EUR',
        maximumFractionDigits: 2,
      }).format((cents || 0) / 100),
    // Uma taxa guarda-se como fração (0,23) e mostra-se como
    // percentagem — a conversão é do `Intl`, não nossa.
    taxa: (fracao) =>
      new Intl.NumberFormat(ctx.data.intlLocale, { style: 'percent', maximumFractionDigits: 2 }).format(fracao || 0),
    pontos: (v) =>
      (v > 0 ? '+' : '') + new Intl.NumberFormat(ctx.data.intlLocale, { maximumFractionDigits: 1 }).format(v || 0) + '%',
    data: (iso) => {
      if (!iso) return '—';
      const d = new Date(iso + 'T00:00:00');
      return isNaN(d) ? iso : new Intl.DateTimeFormat(ctx.data.intlLocale, { day: 'numeric', month: 'short', year: 'numeric' }).format(d);
    },
    /** `{x}` no texto das duas línguas — ver financas.pt.ts. */
    fill: (tpl, vals) => String(tpl || '').replace(/\{(\w+)\}/g, (_, k) => (vals[k] == null ? '' : String(vals[k]))),
  };

  const api = {
    guardar: (tipo, campos) => postJson('/api/financas/guardar/' + tipo, campos),
    remover: (tipo, id) => postJson('/api/financas/remover/' + tipo, { id }),
    taxas: (campos) => postJson('/api/financas/taxas', campos),
    partilhar: (corpo) => postJson('/api/financas/partilhar', corpo),
  };

  const painel = () => (ctx.bolsa ? ctx.bolsa.main : null);
  const vista = createFinResumo(ctx, fmt);
  const detalhe = createFinDetalhe(ctx, fmt, api, () => recarregar());

  // ── A lista ────────────────────────────────────────────────────────
  /** O total de um cliente no ano, do resumo que o servidor já somou —
      não se volta a somar aqui: duas somas do mesmo são duas somas que
      um dia divergem. */
  function doCliente(id) {
    const linhas = (resumo && resumo.resumo && resumo.resumo.clientes) || [];
    return linhas.find((c) => c.cliente === id) || { faturado: 0, atraso: 0, faturas: 0 };
  }

  function render() {
    if (!dono) return;
    const clientes = (dados && dados.clientes) || [];
    const total = (resumo && resumo.resumo) || null;
    const variacao = total && total.variacao;
    const k = variacao == null ? 'flat' : variacao >= 0 ? 'up' : 'down';

    const linhaResumo =
      '<li class="stk-row relative grid cursor-default grid-cols-[0_1fr_auto] items-center gap-2.5 px-2.5 py-2.25 [[data-mode=\'ios\']_&]:py-3' +
      (aberto === 'resumo' ? ' on bg-(--accent) text-white' : '') +
      '" data-fin-open="resumo">' +
      '<span class="stk-id col-start-2 grid min-w-0 gap-px">' +
      '<span class="stk-sym overflow-hidden text-ellipsis whitespace-nowrap text-[length:var(--t-headline)] font-bold tracking-[-0.01em]">' + esc(t.year) + '</span>' +
      '<span class="stk-name overflow-hidden text-ellipsis whitespace-nowrap text-[length:var(--t-foot)] text-(--ink-3)">' + esc(String(ano)) + '</span></span>' +
      '<span class="stk-quote col-start-3 grid justify-items-end gap-0.5">' +
      '<span class="stk-price text-[length:var(--t-headline)] font-semibold tabular-nums">' + esc(fmt.moeda(total ? total.faturado : 0)) + '</span>' +
      '<span class="' + PILL_CLASS + (aberto === 'resumo' ? 'bg-white/24' : PILL[k]) + '">' + esc(variacao == null ? '—' : fmt.pontos(variacao)) + '</span>' +
      '</span></li>';

    const linhasClientes = clientes.length
      ? clientes
          .map((c) => {
            const soma = doCliente(c.id);
            const on = aberto === c.id;
            // O atraso ganha à variação: é o número que interessa a
            // quem trabalha por conta própria, e por isso rouba a
            // cápsula quando existe.
            const capsula = soma.atraso
              ? '<span class="' + PILL_CLASS + (on ? 'bg-white/24' : PILL.down) + '">' + esc(fmt.moeda(soma.atraso)) + '</span>'
              : '';
            return (
              '<li class="stk-row relative grid cursor-default grid-cols-[0_1fr_auto] items-center gap-2.5 px-2.5 py-2.25 [[data-mode=\'ios\']_&]:py-3' +
              (on ? ' on bg-(--accent) text-white' : '') +
              '" data-fin-open="' + esc(c.id) + '">' +
              '<span class="stk-id col-start-2 grid min-w-0 gap-px">' +
              '<span class="stk-sym overflow-hidden text-ellipsis whitespace-nowrap text-[length:var(--t-headline)] font-bold tracking-[-0.01em]">' + esc(c.nome) + '</span>' +
              '<span class="stk-name overflow-hidden text-ellipsis whitespace-nowrap text-[length:var(--t-foot)] text-(--ink-3)">' +
              esc(fmt.fill(t.clientLine, { faturas: soma.faturas, valor: fmt.moeda(soma.faturado) })) +
              '</span></span>' +
              '<span class="stk-quote col-start-3 grid justify-items-end gap-0.5">' +
              '<span class="stk-price text-[length:var(--t-headline)] font-semibold tabular-nums">' + esc(fmt.moeda(soma.faturado)) + '</span>' +
              capsula +
              '</span></li>'
            );
          })
          .join('')
      : '<li class="stk-empty-row py-5 px-2.5 text-center text-[length:var(--t-foot)] text-(--ink-3)">' + esc(t.noClients) + '</li>';

    lista.innerHTML =
      linhaResumo +
      linhasClientes +
      '<li class="px-2.5 pt-1.5 pb-1"><button type="button" class="min-h-7 text-[length:var(--t-subhead)] font-medium text-(--accent)" data-fin-novo="cliente">+ ' + esc(t.add) + '</button></li>';
  }

  // ── Abrir ──────────────────────────────────────────────────────────
  function abrir(id) {
    const main = painel();
    if (!main) return;
    aberto = id;
    // O painel é partilhado: a Bolsa larga o título que tivesse aberto,
    // senão o relógio dos 30 segundos reescrevia isto por baixo.
    if (ctx.bolsa) {
      ctx.bolsa.release();
      ctx.bolsa.open();
    }
    render();
    if (id === 'resumo') vista.render(main, resumo, dados, api, () => recarregar());
    else detalhe.render(main, id, dados, resumo);
  }

  async function carregar() {
    const [tudo, ano_] = await Promise.all([
      fetch('/api/financas', { headers: { Accept: 'application/json' } }),
      fetch('/api/financas/resumo?ano=' + ano, { headers: { Accept: 'application/json' } }),
    ]);
    if (!tudo.ok || !ano_.ok) throw new Error('http');
    dados = await tudo.json();
    resumo = await ano_.json();
    if (!dados.ok || !resumo.ok) throw new Error('dados');
  }

  async function recarregar() {
    try {
      await carregar();
      // O que estava aberto pode ter acabado de ser removido — voltar
      // ao resumo é melhor do que ficar num painel de um cliente que já
      // não existe.
      if (aberto && aberto !== 'resumo' && !(dados.clientes || []).some((c) => c.id === aberto)) aberto = 'resumo';
      render();
      if (aberto) abrir(aberto);
    } catch (_) {
      // Sem números, fica o que já lá estava — a app não parte por isto.
    }
  }

  // ── Acordar: só para o dono ────────────────────────────────────────
  async function wake() {
    dono = await amIOwner();
    grupo.hidden = !dono;
    if (!dono) {
      dados = null;
      resumo = null;
      aberto = null;
      lista.innerHTML = '';
      return;
    }
    await recarregar();
  }

  el.addEventListener('click', (ev) => {
    const novo = ev.target.closest('[data-fin-novo]');
    if (novo && dono) {
      // Guardar volta para onde se estava. De dentro de um cliente,
      // `aberto` já é ele; do «+» da barra lateral não há nada aberto, e
      // o sítio certo para aterrar é o resumo do ano.
      if (!aberto) aberto = 'resumo';
      detalhe.novo(painel(), novo.dataset.finNovo, novo.dataset.finPai || '', dados);
      if (ctx.bolsa) ctx.bolsa.open();
      return;
    }
    const linha = ev.target.closest('[data-fin-open]');
    if (linha && dono) abrir(linha.dataset.finOpen);
  });

  ctx.financas = {
    refresh: wake,
    /** A Bolsa chama isto quando alguém abre um título: o painel passa
        a ser dela, e a nossa linha perde o realce. */
    release() {
      if (!aberto) return;
      aberto = null;
      render();
    },
  };

  wake();
}
