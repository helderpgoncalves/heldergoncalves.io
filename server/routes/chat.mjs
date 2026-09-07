// ─────────────────────────────────────────────────────────────────────
// A conversa das Mensagens.
//
// Um agente pequeno e bem amarrado: sabe o que está em knowledge/, tem
// três ferramentas, e no máximo duas rondas de ferramentas por mensagem.
// Não devolve streaming — devolve o texto de uma vez, e o site escreve-o
// letra a letra. Fica mais barato, mais simples, e igual de ver.
// ─────────────────────────────────────────────────────────────────────
import { CHAT, LIMITS, SITE_ORIGIN, chatReady } from '../config.mjs';
import { clean, json, readJson } from '../http.mjs';
import { bump, checkToken, ipKey, wrongOrigin } from '../security.mjs';
import { TOOLS, runTool } from '../agent/tools.mjs';
import { systemPrompt } from '../agent/prompt.mjs';

const AGENT_ROUNDS = 2;

async function callModel(messages, useTools) {
  const body = {
    model: CHAT.model,
    max_tokens: LIMITS.chatOutTokens,
    temperature: 0.3,
    messages,
  };
  if (useTools) {
    body.tools = TOOLS;
    body.tool_choice = 'auto';
  }
  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: 'Bearer ' + CHAT.key,
      'Content-Type': 'application/json',
      'HTTP-Referer': SITE_ORIGIN,
      'X-Title': 'heldergoncalves.io',
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(35000),
  });
  if (!res.ok) throw new Error('upstream ' + res.status);
  const data = await res.json();
  const choice = data.choices && data.choices[0];
  if (!choice) throw new Error('resposta vazia');
  return choice.message || {};
}

/**
 * O histórico que vem do browser não é de confiança. Ou é exactamente o
 * que devia ser — turnos alternados, dentro dos limites, a acabar em
 * quem pergunta — ou não se fala com o modelo.
 */
function validTurns(list) {
  if (!Array.isArray(list)) return null;
  const turns = [];
  let total = 0;
  for (const item of list.slice(-LIMITS.chatHistory)) {
    if (!item || typeof item !== 'object') return null;
    const role = item.role === 'assistant' ? 'assistant' : item.role === 'user' ? 'user' : null;
    if (!role) return null;
    const content = clean(item.content, LIMITS.chatTurn);
    if (!content) return null;
    total += content.length;
    turns.push({ role, content });
  }
  if (!turns.length || total > LIMITS.chatTotal) return null;
  if (turns[turns.length - 1].role !== 'user') return null;
  return turns;
}

export async function handleChat(req, res) {
  if (!chatReady) return json(res, 503, { ok: false, error: 'indisponivel' });

  const bad = wrongOrigin(req, SITE_ORIGIN);
  if (bad) return json(res, bad === 'origem' ? 403 : 415, { ok: false, error: bad });

  const key = ipKey(req);
  if (!bump('chat:' + key, LIMITS.chatPerIpWindow, LIMITS.chatPerIp))
    return json(res, 429, { ok: false, error: 'limite' });
  if (!bump('chatd:' + key, LIMITS.chatDayWindow, LIMITS.chatPerIpDay))
    return json(res, 429, { ok: false, error: 'limite' });
  if (!bump('chat:global', LIMITS.chatDayWindow, LIMITS.chatGlobalDay))
    return json(res, 429, { ok: false, error: 'ocupado' });

  const payload = await readJson(req, LIMITS.chatBody);
  if (!payload) return json(res, 400, { ok: false, error: 'corpo' });

  const tokenError = checkToken(payload.token, key, { minAge: 600, singleUse: false });
  if (tokenError) return json(res, 400, { ok: false, error: tokenError });

  const turns = validTurns(payload.messages);
  if (!turns) return json(res, 400, { ok: false, error: 'mensagens' });

  const lang = payload.lang === 'en' ? 'en' : 'pt';
  const messages = [{ role: 'system', content: systemPrompt(lang) }].concat(turns);

  try {
    for (let round = 0; round <= AGENT_ROUNDS; round++) {
      // Na última ronda o modelo já não tem ferramentas: tem de responder.
      const last = round === AGENT_ROUNDS;
      const reply = await callModel(messages, !last);
      const calls = Array.isArray(reply.tool_calls) ? reply.tool_calls.slice(0, 3) : [];

      if (!calls.length) {
        const text = clean(reply.content, 1500);
        if (!text) return json(res, 502, { ok: false, error: 'vazio' });
        return json(res, 200, { ok: true, text });
      }

      messages.push({ role: 'assistant', content: reply.content || null, tool_calls: calls });
      for (const call of calls) {
        let args = {};
        try {
          args = JSON.parse((call.function && call.function.arguments) || '{}');
        } catch (_) {
          args = {};
        }
        const result = await runTool((call.function && call.function.name) || '', args || {}, key);
        messages.push({ role: 'tool', tool_call_id: call.id, content: String(result).slice(0, 4000) });
      }
    }
    return json(res, 502, { ok: false, error: 'rondas' });
  } catch (err) {
    console.error('[chat] ' + (err && err.message));
    return json(res, 502, { ok: false, error: 'upstream' });
  }
}
