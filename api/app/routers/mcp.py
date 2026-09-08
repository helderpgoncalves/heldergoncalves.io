# ─────────────────────────────────────────────────────────────────────
# O site também é um servidor MCP.
#
# Um agente de fora pode perguntar o que o Hélder faz, listar os
# escritos e deixar recado — sem ler HTML nenhum. JSON-RPC 2.0 em
# POST /mcp, que é o transporte HTTP do protocolo.
#
# As ferramentas são as mesmas do agente das Mensagens: vêm de
# agent/tools.py, não há uma segunda cópia da lógica.
# ─────────────────────────────────────────────────────────────────────
from fastapi import APIRouter, Request
from starlette.responses import JSONResponse, Response

from app.agent.tools import run_tool
from app.config import LIMITS, SITE_ORIGIN
from app.http import read_json
from app.knowledge import POSTS, post_line, search
from app.security import SECURITY_HEADERS, bump, ip_key
from app.validation import clean

router = APIRouter()

MCP_TOOLS = [
    {
        "name": "procurar",
        "description": "Procura na base de conhecimento de Hélder Gonçalves e nos escritos publicados.",
        "inputSchema": {
            "type": "object",
            "properties": {"consulta": {"type": "string", "description": "Palavras-chave."}},
            "required": ["consulta"],
        },
    },
    {
        "name": "escritos",
        "description": "Lista os escritos publicados, com título, data, língua, resumo e URL.",
        "inputSchema": {"type": "object", "properties": {}},
    },
    {
        "name": "contactar",
        "description": "Envia uma mensagem por email a Hélder Gonçalves. Usar só com consentimento de quem escreve.",
        "inputSchema": {
            "type": "object",
            "properties": {"nome": {"type": "string"}, "email": {"type": "string"}, "mensagem": {"type": "string"}},
            "required": ["nome", "email", "mensagem"],
        },
    },
]

_TOOL_NAMES = {t["name"] for t in MCP_TOOLS}


def _rpc(id_: object, result: object) -> dict:
    return {"jsonrpc": "2.0", "id": id_, "result": result}


def _rpc_error(id_: object, code: int, message: str) -> dict:
    return {"jsonrpc": "2.0", "id": id_, "error": {"code": code, "message": message}}


def _as_text(value: object) -> dict:
    return {"content": [{"type": "text", "text": str(value)[:8000]}]}


async def _call(name: str, args: dict, key: str) -> dict:
    if name == "procurar":
        return _as_text(search(clean(args.get("consulta"), 200)))
    if name == "escritos":
        if not POSTS:
            return _as_text("Ainda não há escritos publicados.")
        return _as_text("\n".join(post_line(p) for p in POSTS))
    if name == "contactar":
        return _as_text(await run_tool("enviar_mensagem", args, key))
    return {"content": [{"type": "text", "text": "Ferramenta desconhecida."}], "isError": True}


@router.get("/mcp")
async def describe_mcp() -> JSONResponse:
    """O cartão de visita, para quem descobre o endpoint."""
    return JSONResponse(
        {
            "name": "heldergoncalves.io",
            "transport": "http",
            "protocol": "mcp",
            "protocolVersion": "2025-06-18",
            "endpoint": SITE_ORIGIN + "/mcp",
            "tools": [t["name"] for t in MCP_TOOLS],
        }
    )


@router.post("/mcp")
async def handle_mcp(request: Request) -> Response:
    key = ip_key(request)
    if not bump("mcp:" + key, LIMITS.chat_per_ip_window, LIMITS.mcp_per_ip):
        return JSONResponse({"ok": False, "error": "limite"}, status_code=429)

    msg = await read_json(request, 32 * 1024)
    if msg is None:
        return JSONResponse(_rpc_error(None, -32700, "JSON inválido"), status_code=400)

    id_ = msg.get("id")
    method = msg.get("method") if isinstance(msg.get("method"), str) else ""

    # Notificações não levam resposta.
    if id_ is None and method.startswith("notifications/"):
        return Response(status_code=202, headers={**SECURITY_HEADERS, "Cache-Control": "no-store"})

    if method == "initialize":
        return JSONResponse(
            _rpc(
                id_,
                {
                    "protocolVersion": "2025-06-18",
                    "capabilities": {"tools": {"listChanged": False}},
                    "serverInfo": {"name": "heldergoncalves.io", "version": "1.0.0"},
                    "instructions": (
                        'O site pessoal de Hélder Gonçalves, engenheiro de software em Barcelos. Usa "procurar" '
                        'para o que ele faz e constrói, "escritos" para os textos publicados, e "contactar" para '
                        "lhe deixar recado."
                    ),
                },
            )
        )
    if method == "ping":
        return JSONResponse(_rpc(id_, {}))
    if method == "tools/list":
        return JSONResponse(_rpc(id_, {"tools": MCP_TOOLS}))
    if method == "tools/call":
        params = msg.get("params") or {}
        name = params.get("name") if isinstance(params.get("name"), str) else ""
        if name not in _TOOL_NAMES:
            return JSONResponse(_rpc_error(id_, -32602, "Ferramenta desconhecida"))
        try:
            result = await _call(name, params.get("arguments") or {}, key)
            return JSONResponse(_rpc(id_, result))
        except Exception:
            return JSONResponse(_rpc(id_, {"content": [{"type": "text", "text": "A ferramenta falhou."}], "isError": True}))
    return JSONResponse(_rpc_error(id_, -32601, "Método não suportado"))
