// ─────────────────────────────────────────────────────────────────────
// O que cada aplicação faz por dentro.
//
// Uma aplicação = um ficheiro nesta pasta + uma linha nesta lista. O
// ficheiro exporta uma função que recebe o contexto, encontra o seu nó
// com `ctx.contentNode(id)` e sai de mansinho se não o encontrar — é
// isso que deixa o mesmo código servir o Mac e o telefone.
//
// Ligam-se uma vez, ao conteúdo. Os nós movem-se entre janelas e
// vistas, e os listeners vão com eles: não há nada a religar quando uma
// janela abre ou fecha.
// ─────────────────────────────────────────────────────────────────────
import { initEscritos } from './escritos.js';
import { initSubscribe } from './subscrever.js';
import { initTerminal } from './terminal.js';
import { initChat } from './mensagens.js';
import { initCompose } from './contacto.js';
import { initSettings } from './definicoes.js';
import { initSimulator } from './simulador.js';
import { initBolsa } from './bolsa.js';
import { initCalendario } from './calendario.js';

const APPS = [initEscritos, initSubscribe, initTerminal, initChat, initCompose, initSettings, initSimulator, initBolsa, initCalendario];

export function initApps(ctx) {
  for (const init of APPS) init(ctx);
}
