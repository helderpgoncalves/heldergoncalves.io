// ─────────────────────────────────────────────────────────────────────
// Os formulários das Finanças: os campos de cada peça, o HTML deles, e a
// leitura do que lá ficou escrito.
//
// Um sítio só a decidir o que é um campo. O painel do cliente e o
// editor de taxas usam os mesmos — e é por isso que escrever «valor»
// dá sempre a mesma caixa, com a mesma vírgula e o mesmo teclado no
// telemóvel.
//
// **O dinheiro entra em euros e sai em cêntimos.** A API só fala
// cêntimos (ver api/app/financas_calc.py); quem escreve escreve euros.
// A conversão é aqui, e em mais lado nenhum.
// ─────────────────────────────────────────────────────────────────────
import { esc } from '../lib/dom.js';

const CAIXA =
  'w-full min-w-0 border-[0.5px] border-(--line) bg-(--surface-solid) px-2 py-1.5 text-[length:var(--t-subhead)] text-(--ink) outline-hidden focus:border-(--accent)';

/** Os campos de cada peça. `dados` serve para as escolhas (que cliente,
    que projeto) virem dos que existem, nunca escritos à mão. */
export function camposDe(t, tipo, dados, valores) {
  const v = valores || {};
  const f = t.fields;
  const clientes = ((dados && dados.clientes) || []).map((c) => [c.id, c.nome]);
  const projetos = ((dados && dados.projetos) || []).map((p) => [p.id, p.nome]);
  const avencas = ((dados && dados.avencas) || []).map((a) => [a.id, a.nome]);
  if (tipo === 'cliente')
    return [
      { nome: 'nome', etiqueta: f.name, tipo: 'texto', valor: v.nome },
      { nome: 'email', etiqueta: f.email, tipo: 'email', valor: v.email },
      { nome: 'nif', etiqueta: f.nif, tipo: 'texto', valor: v.nif },
      { nome: 'notas', etiqueta: f.notes, tipo: 'area', valor: v.notas },
    ];
  if (tipo === 'projeto')
    return [
      { nome: 'nome', etiqueta: f.name, tipo: 'texto', valor: v.nome },
      { nome: 'cliente', etiqueta: f.client, tipo: 'escolha', valor: v.cliente, opcoes: clientes },
    ];
  if (tipo === 'fase')
    return [
      { nome: 'nome', etiqueta: f.name, tipo: 'texto', valor: v.nome },
      { nome: 'projeto', etiqueta: f.project, tipo: 'escolha', valor: v.projeto, opcoes: projetos },
      { nome: 'valor', etiqueta: f.value, tipo: 'moeda', valor: v.valor },
      { nome: 'previsto', etiqueta: f.expected, tipo: 'data', valor: v.previsto },
      { nome: 'faturada', etiqueta: t.billed, tipo: 'interruptor', valor: v.faturada },
    ];
  if (tipo === 'avenca')
    return [
      { nome: 'nome', etiqueta: f.name, tipo: 'texto', valor: v.nome },
      { nome: 'cliente', etiqueta: f.client, tipo: 'escolha', valor: v.cliente, opcoes: clientes },
      { nome: 'valor', etiqueta: f.monthly, tipo: 'moeda', valor: v.valor },
      { nome: 'dia', etiqueta: f.day, tipo: 'numero', valor: v.dia },
      { nome: 'inicio', etiqueta: f.begins, tipo: 'data', valor: v.inicio },
      { nome: 'fim', etiqueta: f.ends, tipo: 'data', valor: v.fim },
    ];
  if (tipo === 'fatura')
    return [
      { nome: 'numero', etiqueta: f.number, tipo: 'texto', valor: v.numero },
      { nome: 'cliente', etiqueta: f.client, tipo: 'escolha', valor: v.cliente, opcoes: clientes },
      { nome: 'projeto', etiqueta: f.project, tipo: 'escolha', valor: v.projeto, opcoes: projetos, vazio: f.none },
      { nome: 'avenca', etiqueta: f.avenca, tipo: 'escolha', valor: v.avenca, opcoes: avencas, vazio: f.none },
      { nome: 'base', etiqueta: f.base, tipo: 'moeda', valor: v.base },
      { nome: 'data', etiqueta: f.date, tipo: 'data', valor: v.data },
      { nome: 'vence', etiqueta: f.due, tipo: 'data', valor: v.vence },
      {
        nome: 'estado',
        etiqueta: f.state,
        tipo: 'escolha',
        valor: v.estado || 'emitida',
        opcoes: [['emitida', t.states.emitida], ['paga', t.states.paga], ['atraso', t.states.atraso]],
      },
      { nome: 'pago_em', etiqueta: f.paidOn, tipo: 'data', valor: v.pago_em },
    ];
  return [];
}

/** As taxas e o regime. Todas as percentagens escrevem-se como
    percentagens — 23, não 0,23 — e é `lerForma` que as converte para a
    fração que a API guarda. */
export function camposTaxas(t, taxas) {
  const f = t.fields;
  const x = taxas || {};
  return [
    { nome: 'iva', etiqueta: f.iva, tipo: 'taxa', valor: x.iva },
    { nome: 'iva_isento', etiqueta: f.ivaExempt, tipo: 'interruptor', valor: x.iva_isento },
    { nome: 'iva_motivo', etiqueta: f.ivaReason, tipo: 'texto', valor: x.iva_motivo },
    { nome: 'retencao', etiqueta: f.retencao, tipo: 'taxa', valor: x.retencao },
    { nome: 'retencao_dispensa', etiqueta: f.retencaoWaived, tipo: 'interruptor', valor: x.retencao_dispensa },
    { nome: 'coeficiente', etiqueta: f.coeficiente, tipo: 'taxa', valor: x.coeficiente },
    { nome: 'ss_taxa', etiqueta: f.ssTaxa, tipo: 'taxa', valor: x.ss_taxa },
    { nome: 'ss_base', etiqueta: f.ssBase, tipo: 'taxa', valor: x.ss_base },
    { nome: 'ss_isencao_meses', etiqueta: f.ssMonths, tipo: 'numero', valor: x.ss_isencao_meses },
    { nome: 'atividade_inicio', etiqueta: f.start, tipo: 'data', valor: x.atividade_inicio },
    { nome: 'objetivo', etiqueta: f.goal, tipo: 'moeda', valor: x.objetivo },
  ];
}

function campoHtml(c, id) {
  const rotulo = '<span class="text-[length:var(--t-caption)] text-(--ink-3)">' + esc(c.etiqueta) + '</span>';
  const base = ' data-fin-campo="' + esc(c.nome) + '" data-fin-tipo="' + esc(c.tipo) + '" id="' + esc(id) + '"';
  if (c.tipo === 'interruptor')
    return (
      '<label class="grid grid-flow-col justify-start items-center gap-2 min-w-0" for="' + esc(id) + '">' +
      '<input type="checkbox"' + base + (c.valor ? ' checked' : '') + ' />' + rotulo + '</label>'
    );
  if (c.tipo === 'escolha') {
    const opcoes = (c.vazio ? '<option value="">' + esc(c.vazio) + '</option>' : '') +
      (c.opcoes || []).map(([id_, nome]) => '<option value="' + esc(id_) + '"' + (c.valor === id_ ? ' selected' : '') + '>' + esc(nome) + '</option>').join('');
    return '<label class="grid gap-1 min-w-0" for="' + esc(id) + '">' + rotulo + '<select class="' + CAIXA + '"' + base + '>' + opcoes + '</select></label>';
  }
  if (c.tipo === 'area')
    return '<label class="grid gap-1 min-w-0" for="' + esc(id) + '">' + rotulo + '<textarea rows="2" class="' + CAIXA + '"' + base + '>' + esc(c.valor || '') + '</textarea></label>';

  // Dinheiro escreve-se em euros; a API recebe cêntimos.
  const valor =
    c.tipo === 'moeda' ? (c.valor ? (c.valor / 100).toFixed(2) : '')
    : c.tipo === 'taxa' ? (c.valor == null ? '' : String(Math.round(c.valor * 10000) / 100))
    : c.valor == null ? '' : String(c.valor);
  const attrs =
    c.tipo === 'moeda' ? 'type="number" step="0.01" min="0" inputmode="decimal"'
    : c.tipo === 'taxa' ? 'type="number" step="0.1" min="0" max="100" inputmode="decimal"'
    : c.tipo === 'numero' ? 'type="number" step="1" min="0" inputmode="numeric"'
    : c.tipo === 'data' ? 'type="date"'
    : c.tipo === 'email' ? 'type="email" autocapitalize="off" spellcheck="false"'
    : 'type="text"';
  return '<label class="grid gap-1 min-w-0" for="' + esc(id) + '">' + rotulo + '<input ' + attrs + ' class="' + CAIXA + '" value="' + esc(valor) + '"' + base + ' /></label>';
}

/**
 * A grelha de campos. Cada item de uma grelha mede `min-width: auto` —
 * um campo com um `<select>` de nomes compridos esticava a coluna toda e
 * punha o painel a sair pelo lado. `minmax(0, …)` e `min-w-0` em cada
 * campo é o que impede isso; foi assim que o detalhe da Bolsa saía do
 * ecrã.
 */
export function formaHtml(titulo, campos, acoes, prefixo) {
  return (
    // O prefixo vai no atributo, não só nos `id`: há dois formulários
    // no mesmo painel (as taxas, no resumo; as peças, no detalhe) e cada
    // um tem de saber que o `submit` que lhe chegou é mesmo dele.
    '<form class="fin-forma grid gap-3" data-fin-forma="' + esc(prefixo || 'fin') + '" novalidate>' +
    (titulo ? '<h3 class="m-0 text-[length:var(--t-headline)] font-bold tracking-[-0.01em]">' + esc(titulo) + '</h3>' : '') +
    '<div class="grid grid-cols-[repeat(auto-fit,minmax(150px,1fr))] gap-2.5">' +
    campos.map((c, i) => campoHtml(c, (prefixo || 'fin') + '-' + c.nome + '-' + i)).join('') +
    '</div>' +
    '<div class="flex flex-wrap gap-2">' + acoes + '</div>' +
    '</form>'
  );
}

export const BOTAO = 'min-h-8 px-3 py-1 text-[length:var(--t-subhead)] font-medium text-(--accent)';
export const BOTAO_PERIGO = 'min-h-8 px-3 py-1 text-[length:var(--t-subhead)] font-medium text-(--red)';

/** O que ficou escrito, já no formato que a API espera. */
export function lerForma(root) {
  const out = {};
  root.querySelectorAll('[data-fin-campo]').forEach((campo) => {
    const nome = campo.dataset.finCampo;
    const tipo = campo.dataset.finTipo;
    if (tipo === 'interruptor') {
      out[nome] = campo.checked;
      return;
    }
    const bruto = campo.value.trim();
    if (tipo === 'moeda') out[nome] = bruto === '' ? 0 : Math.round(Number(bruto) * 100);
    else if (tipo === 'taxa') out[nome] = bruto === '' ? 0 : Number(bruto) / 100;
    else if (tipo === 'numero') out[nome] = bruto === '' ? 0 : Math.round(Number(bruto));
    else out[nome] = bruto;
  });
  return out;
}
