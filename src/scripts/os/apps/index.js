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
import { initComentarios } from './comentarios.js';
import { initEscritosEditor } from './escritos-editor.js';
import { initSubscribe } from './subscrever.js';
import { initTerminal } from './terminal.js';
import { initChat } from './mensagens.js';
import { initCompose } from './contacto.js';
import { initSettings } from './definicoes.js';
import { initSimulator } from './simulador.js';
import { initBolsa } from './bolsa.js';
import { initCalendario } from './calendario.js';
import { initPessoas } from './pessoas.js';

// `initComentarios` depois de `initEscritos`, de propósito: precisa do
// `[data-comments]` que já vem servido no arranque, e lê-o assim que
// arranca — mas nunca precisa de nada que só `initEscritos` ponha no
// objecto partilhado, por isso a ordem não é uma dependência a sério.
const APPS = [initEscritos, initComentarios, initEscritosEditor, initSubscribe, initTerminal, initChat, initCompose, initSettings, initSimulator, initBolsa, initCalendario, initPessoas];

export function initApps(ctx) {
  for (const init of APPS) init(ctx);
}
