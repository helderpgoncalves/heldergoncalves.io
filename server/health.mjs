// ─────────────────────────────────────────────────────────────────────
// A saúde do container.
//
// Um healthcheck que devolve sempre `ok` porque o processo está vivo não
// serve para nada: um processo pode estar vivo e a devolver 404 a tudo,
// se a pasta do site não estiver onde devia. Este confirma o que
// interessa mesmo — que há um `index.html` para servir — e é isso que
// torna um deploy falhado num rollback em vez de num site em branco.
//
// A resposta são dois bytes. A verificação é uma chamada ao sistema, e
// mesmo essa fica em cache durante dez segundos, porque a alternativa
// era um `stat` a cada trinta segundos para responder a uma pergunta que
// muda uma vez por deploy.
// ─────────────────────────────────────────────────────────────────────
import { access } from 'node:fs/promises';
import { constants } from 'node:fs';
import { join } from 'node:path';
import { ROOT } from './config.mjs';
import { send } from './http.mjs';

/** Quanto tempo a resposta anterior continua a valer. */
const MEMO = 10_000;

let ready = false;
let checkedAt = 0;

async function isReady() {
  const now = Date.now();
  if (now - checkedAt < MEMO) return ready;
  checkedAt = now;
  try {
    await access(join(ROOT, 'index.html'), constants.R_OK);
    ready = true;
  } catch (_) {
    ready = false;
  }
  return ready;
}

/** Chamado no arranque, para o primeiro healthcheck não esperar por I/O. */
export async function primeHealth() {
  const ok = await isReady();
  if (!ok) console.error('saúde:      sem index.html em ' + ROOT + ' — o container vai ficar unhealthy');
  return ok;
}

/**
 * GET /healthz — 200 `ok` se o site pode ser servido, 503 se não.
 * Sem corpo em HEAD, sem cache em lado nenhum, sem registo: são 2880
 * pedidos por dia e nenhum deles interessa a ninguém.
 */
export async function handleHealth(req, res) {
  const ok = await isReady();
  return send(res, ok ? 200 : 503, ok ? 'ok' : 'no', {
    'Content-Type': 'text/plain; charset=utf-8',
    'Cache-Control': 'no-store',
    'Content-Length': '2',
  });
}
