// ─────────────────────────────────────────────────────────────────────
// O detalhe de um cliente: os projetos e as suas fases, as avenças, as
// faturas, e o que está em atraso.
//
// É a lista dos títulos com outro assunto — toca-se num nome à esquerda
// e abre-se aqui o que há sobre ele.
//
// É também daqui que se liga o interruptor de **partilhar com o
// cliente**: o PDF verdadeiro, o que saiu do Portal das Finanças, vai
// para a pasta «Faturas» dele na app Ficheiros. A app não gera faturas
// — duas versões do mesmo documento e o cliente guardava a errada. Ver
// api/app/financas_partilha.py.
// ─────────────────────────────────────────────────────────────────────
import { esc } from '../lib/dom.js';
import { INK } from './bolsa-grafico.js';
import { BOTAO, BOTAO_PERIGO, camposDe, formaHtml, lerForma } from './financas-forma.js';

export function createFinDetalhe(ctx, fmt, api, recarregar) {
  const t = ctx.data.strings.financas;
  let ligado = false;
  let estado = { tipo: '', id: '', dados: null };

  const CARTAO = 'stk-stats-item bg-(--surface-2) px-3 py-2.5 grid gap-1 min-w-0';
  const TITULO = 'm-0 text-[length:var(--t-headline)] font-bold tracking-[-0.01em]';

  function seccao(titulo, corpo, novo, pai) {
    return (
      '<section class="grid gap-2">' +
      '<div class="flex items-baseline justify-between gap-3"><h3 class="' + TITULO + '">' + esc(titulo) + '</h3>' +
      '<button type="button" class="' + BOTAO + '" data-fin-novo="' + esc(novo) + '" data-fin-pai="' + esc(pai || '') + '">+ ' + esc(t.add) + '</button></div>' +
      (corpo || '<p class="m-0 text-[length:var(--t-foot)] text-(--ink-3)">—</p>') +
      '</section>'
    );
  }

  function linhaEditavel(tipo, id, titulo, sub, direita) {
    return (
      '<div class="' + CARTAO + '">' +
      '<div class="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">' +
      '<span class="min-w-0 overflow-hidden text-ellipsis whitespace-nowrap text-[length:var(--t-subhead)] font-semibold">' + esc(titulo) + '</span>' +
      (direita || '') + '</div>' +
      // `div`, não `span`: o subtítulo de um projeto leva a lista das
      // fases lá dentro, e uma lista dentro de um elemento em linha é
      // marcação inválida — o browser desmancha-a e o recuo perde-se.
      (sub ? '<div class="grid gap-1 text-[length:var(--t-caption)] text-(--ink-3)">' + sub + '</div>' : '') +
      '<div class="flex flex-wrap gap-1">' +
      '<button type="button" class="' + BOTAO + '" data-fin-editar="' + esc(tipo) + '" data-fin-id="' + esc(id) + '">' + esc(t.edit) + '</button>' +
      '<button type="button" class="' + BOTAO_PERIGO + '" data-fin-apagar="' + esc(tipo) + '" data-fin-id="' + esc(id) + '">' + esc(t.remove) + '</button>' +
      '</div></div>'
    );
  }

  function projetos(dados, clienteId) {
    const meus = (dados.projetos || []).filter((p) => p.cliente === clienteId);
    if (!meus.length) return '';
    return (
      '<div class="grid gap-2">' +
      meus
        .map((p) => {
          const fases = (dados.fases || []).filter((f) => f.projeto === p.id);
          const lista = fases.length
            ? '<ul class="m-0 grid list-none gap-1 p-0">' +
              fases
                .map(
                  (f) =>
                    '<li class="flex flex-wrap items-baseline justify-between gap-x-3 text-[length:var(--t-foot)]">' +
                    '<span class="min-w-0 overflow-hidden text-ellipsis whitespace-nowrap">' + esc(f.nome) + '</span>' +
                    '<span class="tabular-nums ' + (f.faturada ? INK.flat : INK.up) + '">' +
                    esc(fmt.fill(t.phaseLine, { valor: fmt.moeda(f.valor), data: fmt.data(f.previsto) })) + '</span>' +
                    '<button type="button" class="' + BOTAO + '" data-fin-editar="fase" data-fin-id="' + esc(f.id) + '">' + esc(t.edit) + '</button>' +
                    '</li>'
                )
                .join('') +
              '</ul>'
            : '';
          return linhaEditavel(
            'projeto',
            p.id,
            p.nome,
            lista + '<button type="button" class="' + BOTAO + '" data-fin-novo="fase" data-fin-pai="' + esc(p.id) + '">+ ' + esc(t.phases) + '</button>',
            ''
          );
        })
        .join('') +
      '</div>'
    );
  }

  function avencas(dados, clienteId) {
    const meus = (dados.avencas || []).filter((a) => a.cliente === clienteId);
    if (!meus.length) return '';
    return (
      '<div class="grid gap-2">' +
      meus
        .map((a) =>
          linhaEditavel(
            'avenca',
            a.id,
            a.nome,
            esc(fmt.fill(t.perMonth, { valor: fmt.moeda(a.valor) })),
            '<span class="tabular-nums text-[length:var(--t-subhead)] font-semibold">' + esc(fmt.moeda(a.valor)) + '</span>'
          )
        )
        .join('') +
      '</div>'
    );
  }

  function faturas(dados, clienteId) {
    const minhas = (dados.faturas || []).filter((f) => f.cliente === clienteId);
    if (!minhas.length) return '';
    const cliente = (dados.clientes || []).find((c) => c.id === clienteId) || {};
    return (
      '<div class="grid gap-2">' +
      minhas
        .map((f) => {
          const cor = f.estado === 'atraso' ? INK.down : f.estado === 'paga' ? INK.up : INK.flat;
          // Faturado e recebido lado a lado, nunca somados: o total é o
          // que vai na fatura, o «a receber» é o que chega à conta.
          const sub =
            esc(t.states[f.estado] || f.estado) + ' · ' + esc(fmt.data(f.data)) +
            ' · ' + esc(t.invoiced) + ' ' + esc(fmt.moeda(f.total)) +
            ' · ' + esc(t.received) + ' ' + esc(fmt.moeda(f.receber));
          const partilha = f.partilhada
            ? '<button type="button" class="' + BOTAO_PERIGO + '" data-fin-unshare="' + esc(f.id) + '">' + esc(t.unshare) + '</button>' +
              '<span class="text-[length:var(--t-caption)] text-(--ink-3)">' + esc(t.shared) + '</span>'
            : cliente.email
              ? '<button type="button" class="' + BOTAO + '" data-fin-share="' + esc(f.id) + '">' + esc(t.share) + '</button>'
              : '<span class="text-[length:var(--t-caption)] text-(--ink-3)">' + esc(t.shareNoEmail) + '</span>';
          return (
            '<div class="' + CARTAO + '">' +
            '<div class="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">' +
            '<span class="min-w-0 overflow-hidden text-ellipsis whitespace-nowrap text-[length:var(--t-subhead)] font-semibold">' + esc(f.numero || fmt.data(f.data)) + '</span>' +
            '<span class="tabular-nums text-[length:var(--t-subhead)] font-semibold ' + cor + '">' + esc(fmt.moeda(f.receber)) + '</span></div>' +
            '<span class="text-[length:var(--t-caption)] text-(--ink-3)">' + sub + '</span>' +
            '<div class="flex flex-wrap items-center gap-1">' + partilha +
            '<button type="button" class="' + BOTAO + '" data-fin-editar="fatura" data-fin-id="' + esc(f.id) + '">' + esc(t.edit) + '</button>' +
            '<button type="button" class="' + BOTAO_PERIGO + '" data-fin-apagar="fatura" data-fin-id="' + esc(f.id) + '">' + esc(t.remove) + '</button>' +
            '</div></div>'
          );
        })
        .join('') +
      '</div>'
    );
  }

  function render(main, clienteId, dados, resumo) {
    if (!main || !dados) return;
    const cliente = (dados.clientes || []).find((c) => c.id === clienteId);
    if (!cliente) return;
    estado = { tipo: '', id: '', dados };
    const soma = (((resumo || {}).resumo || {}).clientes || []).find((c) => c.cliente === clienteId) || { faturado: 0, atraso: 0 };

    main.innerHTML =
      '<div class="fin-panel grid grid-cols-[minmax(0,1fr)] gap-4.5 px-6.5 pb-7.5 pt-5.5 @max-[560px]/app:gap-4 @max-[560px]/app:px-4.5 @max-[380px]/app:px-3.5">' +
      '<header class="flex items-start justify-between gap-4 @max-[560px]/app:flex-wrap @max-[560px]/app:gap-1">' +
      '<div class="min-w-0"><h2 class="m-0 text-[length:var(--t-title)] font-bold tracking-[-0.02em]">' + esc(cliente.nome) + '</h2>' +
      '<p class="mb-0 mt-0.5 text-[length:var(--t-subhead)] text-(--ink-3)">' + esc(cliente.email || '—') + '</p></div>' +
      '<div class="grid justify-items-end gap-0.5 @max-[560px]/app:justify-items-start">' +
      '<span class="text-[length:var(--t-large)] font-bold tracking-[-0.02em] tabular-nums">' + esc(fmt.moeda(soma.faturado)) + '</span>' +
      (soma.atraso
        ? '<span class="text-[length:var(--t-subhead)] font-semibold tabular-nums ' + INK.down + '">' + esc(t.overdue) + ' ' + esc(fmt.moeda(soma.atraso)) + '</span>'
        : '<span class="text-[length:var(--t-caption)] text-(--ink-3)">' + esc(t.noOverdue) + '</span>') +
      '</div></header>' +
      '<div class="flex flex-wrap gap-1">' +
      '<button type="button" class="' + BOTAO + '" data-fin-editar="cliente" data-fin-id="' + esc(cliente.id) + '">' + esc(t.edit) + '</button>' +
      '<button type="button" class="' + BOTAO_PERIGO + '" data-fin-apagar="cliente" data-fin-id="' + esc(cliente.id) + '">' + esc(t.remove) + '</button></div>' +
      seccao(t.projects, projetos(dados, cliente.id), 'projeto', cliente.id) +
      seccao(t.avencas, avencas(dados, cliente.id), 'avenca', cliente.id) +
      seccao(t.invoices, faturas(dados, cliente.id), 'fatura', cliente.id) +
      '<p class="m-0 text-[length:var(--t-caption)] text-(--ink-3)">' + esc(t.disclaimer) + '</p>' +
      '</div>';
    ligar(main);
  }

  /** O formulário de uma peça nova, ou de uma que já existe. `pai` é o
      cliente ou o projeto a que ela pertence — vem já escolhido, porque
      quem carregou em «+» dentro de um projeto já disse qual era. */
  const TITULOS = { cliente: t.clients, projeto: t.projects, fase: t.phases, avenca: t.avencas, fatura: t.invoices };

  function forma(main, tipo, valores, dados) {
    if (!main) return;
    estado = { tipo, id: (valores && valores.id) || '', dados };
    main.innerHTML =
      '<div class="fin-panel grid grid-cols-[minmax(0,1fr)] gap-4 px-6.5 pb-7.5 pt-5.5 @max-[560px]/app:px-4.5 @max-[380px]/app:px-3.5">' +
      formaHtml(
        TITULOS[tipo] || tipo,
        camposDe(t, tipo, dados, valores),
        '<button type="submit" class="' + BOTAO + '">' + esc(t.save) + '</button>' +
          '<button type="button" class="' + BOTAO + '" data-fin-voltar>' + esc(t.cancel) + '</button>',
        'fin-' + tipo
      ) +
      '</div>';
    ligar(main);
  }

  function novo(main, tipo, pai, dados) {
    const valores = tipo === 'fase' ? { projeto: pai } : { cliente: pai };
    forma(main, tipo, valores, dados);
  }

  // ── Os toques ──────────────────────────────────────────────────────
  // Um listener só, no painel, ligado à primeira vez que se desenha
  // aqui: o nó fica, o conteúdo é que muda.
  function ligar(main) {
    if (ligado) return;
    ligado = true;
    // Fora do documento de propósito: o painel reescreve-se por dentro
    // a cada volta, e um campo lá dentro desaparecia com ele.
    const ficheiro = document.createElement('input');
    ficheiro.type = 'file';
    ficheiro.accept = 'application/pdf';
    let aPartilhar = '';

    ficheiro.addEventListener('change', () => {
      const f = ficheiro.files && ficheiro.files[0];
      ficheiro.value = '';
      if (!f || !aPartilhar) return;
      const leitor = new FileReader();
      leitor.onload = () => enviar(api.partilhar({ id: aPartilhar, ligar: true, pdf: String(leitor.result) }));
      leitor.readAsDataURL(f);
    });

    main.addEventListener('click', async (ev) => {
      const voltar = ev.target.closest('[data-fin-voltar]');
      if (voltar) return recarregar();

      const editar = ev.target.closest('[data-fin-editar]');
      if (editar) {
        const tipo = editar.dataset.finEditar;
        const lista = (estado.dados || {})[tipo + 's'] || [];
        const alvo = lista.find((x) => x.id === editar.dataset.finId);
        if (alvo) forma(main, tipo, alvo, estado.dados);
        return;
      }

      const apagar = ev.target.closest('[data-fin-apagar]');
      if (apagar) {
        if (!window.confirm(t.confirmRemove)) return;
        return enviar(api.remover(apagar.dataset.finApagar, apagar.dataset.finId));
      }

      const share = ev.target.closest('[data-fin-share]');
      if (share) {
        aPartilhar = share.dataset.finShare;
        ctx.notify(t.shareHow);
        ficheiro.click();
        return;
      }

      const unshare = ev.target.closest('[data-fin-unshare]');
      if (unshare) return enviar(api.partilhar({ id: unshare.dataset.finUnshare, ligar: false }));
    });

    main.addEventListener('submit', (ev) => {
      const f = ev.target.closest('[data-fin-forma]');
      // O formulário das taxas também vive neste painel e sobe por
      // aqui: só se trata o que é mesmo desta peça.
      if (!f || !estado.tipo || f.dataset.finForma !== 'fin-' + estado.tipo) return;
      ev.preventDefault();
      const campos = lerForma(f);
      if (estado.id) campos.id = estado.id;
      enviar(api.guardar(estado.tipo, campos));
    });
  }

  /** Uma resposta da API, tratada num sítio só: o erro diz-se na língua
      de quem vê, e o que correu bem recarrega tudo. */
  async function enviar(promessa) {
    try {
      const res = await promessa;
      const corpo = await res.json().catch(() => ({}));
      if (!res.ok || !corpo.ok) return ctx.notify(t.errors[corpo.error] || t.errors.generic);
      recarregar();
    } catch (_) {
      ctx.notify(t.errors.generic);
    }
  }

  return { render, novo };
}
