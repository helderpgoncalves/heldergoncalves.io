// ─────────────────────────────────────────────────────────────────────
// Retomar: o que a pessoa estava a fazer sobrevive a ir confirmar o
// email e voltar (magic link) ou a uma simples troca de separador.
//
// Duas coisas guardadas juntas em `sessionStorage`, sob a mesma chave —
// por isso "retrato": um instantâneo do momento em que se decidiu que
// era preciso entrar.
//
//   app     — que aplicação estava aberta (ctx.active), e o escrito
//             aberto dentro de Escritos, se for o caso.
//   pending — o pedido que falhou por falta de sessão (comentar,
//             reagir, e no futuro marcar reunião, pedir orçamento):
//             {url, body}, pronto a repetir sozinho (sempre POST — é o
//             que os endpoints que pedem sessão aceitam hoje).
//
// `sessionStorage`, não `localStorage`: o retrato só faz sentido para
// ESTE separador, nesta visita — é lixo assim que a pessoa fecha a
// aba, e não deve saltar para outra aba aberta no mesmo site.
//
// Só funciona quando a ligação é aberta no mesmo separador que a pediu
// (o caso comum: Mail a auto-preencher, ou copiar/colar no mesmo
// browser). Um dispositivo diferente nunca teve o retrato — abre o
// sistema do zero, com sessão activa e nada para restaurar, que é
// exactamente o comportamento correcto quando não há "onde estava".
// ─────────────────────────────────────────────────────────────────────
import { postJson } from './session.js';

const KEY = 'helderos-retomar';

/**
 * @typedef {{url: string, body: unknown}} Pending
 * @typedef {{app: string|null, post: string|null, pending: Pending|null}} Retrato
 */

/** @returns {Retrato|null} */
function read() {
  try {
    const raw = sessionStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (_) {
    return null;
  }
}

/** @param {Retrato} retrato */
function write(retrato) {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(retrato));
  } catch (_) {
    /* modo privado, ou quota esgotada — a pessoa entra à mesma, só sem retomar */
  }
}

function clear() {
  try {
    sessionStorage.removeItem(KEY);
  } catch (_) {}
}

/**
 * Chamado antes de abrir o ecrã "Entrar" — tira o retrato do momento.
 * `pending`, se vier, é o pedido que se ia fazer e falhou por falta de
 * sessão; sem ele, o retrato é só "onde estava".
 * @param {import('../index.js').Ctx} ctx
 * @param {Pending|null} [pending]
 */
export function capturar(ctx, pending) {
  const app = ctx.active || null;
  const post = app === 'escritos' && ctx.escritos ? ctx.escritos.currentSlug() : null;
  write({ app, post, pending: pending || null });
}

/**
 * Chamado no arranque, só quando há sessão activa. Reabre a app e o
 * escrito do retrato, repete o pedido pendente se houver, e apaga o
 * retrato — retomar é uma coisa que só acontece uma vez.
 * @param {import('../index.js').Ctx} ctx
 * @returns {Promise<void>}
 */
export async function retomar(ctx) {
  const retrato = read();
  clear();
  if (!retrato) return;

  if (retrato.app) {
    ctx.run('open:' + retrato.app);
    if (retrato.app === 'escritos' && retrato.post && ctx.escritos) {
      ctx.escritos.show(retrato.post, true);
    }
  }

  if (retrato.pending) {
    await repetir(retrato.pending);
    // Só agora, com o pedido já gravado: a app de destino (Comentários,
    // hoje) mostra o resultado através do mesmo `refresh` que
    // ctx.onSessionChange já dispara noutros pontos de entrada.
    ctx.onSessionChange && ctx.onSessionChange();
  }
}

/**
 * Repete o pedido guardado — a mesma chamada que falhou por falta de
 * sessão, agora com o cookie já presente. Quem pediu o retomar (a app
 * de origem) é responsável por já ter voltado a mostrar-se antes disto
 * correr, para o resultado aparecer à vista.
 * @param {Pending} pending
 */
async function repetir(pending) {
  try {
    await postJson(pending.url, pending.body);
  } catch (_) {
    /* a pessoa já está autenticada e a ver o sistema — pode repetir a acção à mão */
  }
}

/** Há um retrato à espera de ser retomado? Usa-se no arranque para
 * decidir se vale a pena perguntar `whoAmI()` mais cedo do que o
 * costume. */
export const temRetrato = () => read() !== null;

// ── Pedido pendente de sessão ────────────────────────────────────────
// O padrão do sistema: uma acção que precisa de sessão (comentar,
// reagir, e no futuro marcar reunião, pedir orçamento) tenta-se sempre
// directamente. Só se o servidor responder 401 é que se guarda o
// pedido exacto e se abre o "Entrar" — nunca se esconde o formulário
// antes de tempo. Depois de entrar (no mesmo separador, ou por magic
// link, através do retrato acima), o pedido repete-se sozinho.
//
// `chamarComSessao` é o que qualquer app deve usar em vez de `fetch`
// directo para uma acção destas — devolve o resultado normal quando
// há sessão, ou `{ needsAuth: true }` quando abriu o ecrã de entrar em
// vez de completar o pedido.

/**
 * @param {import('../index.js').Ctx} ctx
 * @param {{url: string, body: unknown}} pedido
 * @returns {Promise<{ok: boolean, status: number, data: any, needsAuth?: boolean}>}
 */
export async function chamarComSessao(ctx, pedido) {
  const res = await postJson(pedido.url, pedido.body);
  if (res.status !== 401) {
    const data = await res.json().catch(() => ({}));
    return { ok: res.ok && data.ok === true, status: res.status, data };
  }
  capturar(ctx, { url: pedido.url, body: pedido.body });
  ctx.entrar.open();
  return { ok: false, status: 401, data: null, needsAuth: true };
}
