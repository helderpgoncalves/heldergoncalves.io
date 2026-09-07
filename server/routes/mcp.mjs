// ─────────────────────────────────────────────────────────────────────
// O site também é um servidor MCP.
//
// Um agente de fora pode perguntar o que o Hélder faz, listar os
// escritos e deixar recado — sem ler HTML nenhum. JSON-RPC 2.0 em
// POST /mcp, que é o transporte HTTP do protocolo.
//
// As ferramentas são as mesmas do agente das Mensagens: vêm de
// agent/tools.mjs, não há uma segunda cópia da lógica.
// ─────────────────────────────────────────────────────────────────────
import { LIMITS, SITE_ORIGIN } from '../config.mjs';
import { clean, json, readJson } from '../http.mjs';
import { SECURITY, bump, ipKey } from '../security.mjs';
import { runTool } from '../agent/tools.mjs';
import { POSTS, postLine, search } from '../knowledge.mjs';

export const MCP_TOOLS = [
  {
    name: 'procurar',
    description: 'Procura na base de conhecimento de Hélder Gonçalves e nos escritos publicados.',
    inputSchema: {
      type: 'object',
      properties: { consulta: { type: 'string', description: 'Palavras-chave.' } },
      required: ['consulta'],
    },
  },
  {
    name: 'escritos',
    description: 'Lista os escritos publicados, com título, data, língua, resumo e URL.',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'contactar',
    description: 'Envia uma mensagem por email a Hélder Gonçalves. Usar só com consentimento de quem escreve.',
    inputSchema: {
      type: 'object',
      properties: {
        nome: { type: 'string' },
        email: { type: 'string' },
        mensagem: { type: 'string' },
      },
      required: ['nome', 'email', 'mensagem'],
    },
  },
];

const rpc = (id, result) => ({ jsonrpc: '2.0', id, result });
const rpcError = (id, code, message) => ({ jsonrpc: '2.0', id, error: { code, message } });
const asText = (value) => ({ content: [{ type: 'text', text: String(value).slice(0, 8000) }] });

async function call(name, args, key) {
  if (name === 'procurar') return asText(search(clean(args.consulta, 200)));
  if (name === 'escritos') {
    if (!POSTS.length) return asText('Ainda não há escritos publicados.');
    return asText(POSTS.map(postLine).join('\n'));
  }
  if (name === 'contactar') return asText(await runTool('enviar_mensagem', args, key));
  return { content: [{ type: 'text', text: 'Ferramenta desconhecida.' }], isError: true };
}

/** GET /mcp — o cartão de visita, para quem descobre o endpoint. */
export function describeMcp(res) {
  return json(res, 200, {
    name: 'heldergoncalves.io',
    transport: 'http',
    protocol: 'mcp',
    protocolVersion: '2025-06-18',
    endpoint: SITE_ORIGIN + '/mcp',
    tools: MCP_TOOLS.map((t) => t.name),
  });
}

export async function handleMcp(req, res) {
  const key = ipKey(req);
  if (!bump('mcp:' + key, LIMITS.chatPerIpWindow, LIMITS.mcpPerIp))
    return json(res, 429, { ok: false, error: 'limite' });

  const msg = await readJson(req, 32 * 1024);
  if (!msg) return json(res, 400, rpcError(null, -32700, 'JSON inválido'));

  const id = msg.id === undefined ? null : msg.id;
  const method = typeof msg.method === 'string' ? msg.method : '';

  // Notificações não levam resposta.
  if (id === null && method.startsWith('notifications/')) {
    res.writeHead(202, { ...SECURITY, 'Cache-Control': 'no-store' });
    return res.end();
  }

  if (method === 'initialize') {
    return json(
      res,
      200,
      rpc(id, {
        protocolVersion: '2025-06-18',
        capabilities: { tools: { listChanged: false } },
        serverInfo: { name: 'heldergoncalves.io', version: '1.0.0' },
        instructions:
          'O site pessoal de Hélder Gonçalves, engenheiro de software em Barcelos. Usa "procurar" para o que ele faz e constrói, "escritos" para os textos publicados, e "contactar" para lhe deixar recado.',
      })
    );
  }
  if (method === 'ping') return json(res, 200, rpc(id, {}));
  if (method === 'tools/list') return json(res, 200, rpc(id, { tools: MCP_TOOLS }));
  if (method === 'tools/call') {
    const params = msg.params || {};
    const name = typeof params.name === 'string' ? params.name : '';
    if (!MCP_TOOLS.some((t) => t.name === name)) return json(res, 200, rpcError(id, -32602, 'Ferramenta desconhecida'));
    try {
      return json(res, 200, rpc(id, await call(name, params.arguments || {}, key)));
    } catch (_) {
      return json(res, 200, rpc(id, { content: [{ type: 'text', text: 'A ferramenta falhou.' }], isError: true }));
    }
  }
  return json(res, 200, rpcError(id, -32601, 'Método não suportado'));
}
