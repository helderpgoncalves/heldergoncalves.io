# ─────────────────────────────────────────────────────────────────────
# A conversa das Mensagens.
#
# Um agente pequeno e bem amarrado: sabe o que está em knowledge/, tem
# três ferramentas, e no máximo duas rondas de ferramentas por mensagem.
# Não devolve streaming — devolve o texto de uma vez, e o site escreve-o
# letra a letra. Fica mais barato, mais simples, e igual de ver.
# ─────────────────────────────────────────────────────────────────────
import json

import httpx
from fastapi import APIRouter, Request
from starlette.responses import JSONResponse

from app.agent.prompt import system_prompt
from app.agent.tools import TOOLS, run_tool
from app.chat_store import conversation_id, record_turn
from app.config import CHAT, CHAT_READY, LIMITS, SITE_ORIGIN
from app.http import read_json
from app.security import bump, check_token, ip_key, wrong_origin
from app.sessions import read_session
from app.validation import clean

router = APIRouter()

AGENT_ROUNDS = 2


async def _call_model(messages: list[dict], use_tools: bool) -> dict:
    body: dict = {
        "model": CHAT.model,
        "max_tokens": LIMITS.chat_out_tokens,
        "temperature": 0.3,
        "messages": messages,
    }
    if use_tools:
        body["tools"] = TOOLS
        body["tool_choice"] = "auto"

    async with httpx.AsyncClient(timeout=35.0) as client:
        res = await client.post(
            "https://openrouter.ai/api/v1/chat/completions",
            headers={
                "Authorization": f"Bearer {CHAT.key}",
                "Content-Type": "application/json",
                "HTTP-Referer": SITE_ORIGIN,
                "X-Title": "heldergoncalves.io",
            },
            json=body,
        )
    if res.status_code >= 300:
        raise RuntimeError(f"upstream {res.status_code}")
    data = res.json()
    choices = data.get("choices") or []
    if not choices:
        raise RuntimeError("resposta vazia")
    return choices[0].get("message") or {}


def _valid_turns(raw: object) -> list[dict] | None:
    """O histórico que vem do browser não é de confiança. Ou é exactamente
    o que devia ser — turnos alternados, dentro dos limites, a acabar em
    quem pergunta — ou não se fala com o modelo."""
    if not isinstance(raw, list):
        return None
    turns = []
    total = 0
    for item in raw[-LIMITS.chat_history :]:
        if not isinstance(item, dict):
            return None
        role = "assistant" if item.get("role") == "assistant" else "user" if item.get("role") == "user" else None
        if not role:
            return None
        content = clean(item.get("content"), LIMITS.chat_turn)
        if not content:
            return None
        total += len(content)
        turns.append({"role": role, "content": content})
    if not turns or total > LIMITS.chat_total:
        return None
    if turns[-1]["role"] != "user":
        return None
    return turns


@router.post("/api/chat")
async def chat(request: Request) -> JSONResponse:
    if not CHAT_READY:
        return JSONResponse({"ok": False, "error": "indisponivel"}, status_code=503)

    bad = wrong_origin(request, SITE_ORIGIN)
    if bad:
        return JSONResponse({"ok": False, "error": bad}, status_code=403 if bad == "origem" else 415)

    key = ip_key(request)
    if not bump("chat:" + key, LIMITS.chat_per_ip_window, LIMITS.chat_per_ip):
        return JSONResponse({"ok": False, "error": "limite"}, status_code=429)
    if not bump("chatd:" + key, LIMITS.chat_day_window, LIMITS.chat_per_ip_day):
        return JSONResponse({"ok": False, "error": "limite"}, status_code=429)
    if not bump("chat:global", LIMITS.chat_day_window, LIMITS.chat_global_day):
        return JSONResponse({"ok": False, "error": "ocupado"}, status_code=429)

    payload = await read_json(request, LIMITS.chat_body)
    if payload is None:
        return JSONResponse({"ok": False, "error": "corpo"}, status_code=400)

    token_error = check_token(payload.get("token"), key, min_age=0.6, single_use=False)
    if token_error:
        return JSONResponse({"ok": False, "error": token_error}, status_code=400)

    turns = _valid_turns(payload.get("messages"))
    if turns is None:
        return JSONResponse({"ok": False, "error": "mensagens"}, status_code=400)

    lang = "en" if payload.get("lang") == "en" else "pt"
    messages: list[dict] = [{"role": "system", "content": system_prompt(lang)}, *turns]

    # Só a mensagem nova, nunca o histórico todo: o browser reenvia até
    # `LIMITS.chat_history` turnos a cada pedido, e gravá-los outra vez
    # a cada volta duplicava tudo o que já estava guardado.
    email = read_session(request.headers.get("cookie", ""))
    conv_id = conversation_id(email, key)
    await record_turn(conv_id, email, "user", turns[-1]["content"], lang)

    try:
        for round_ in range(AGENT_ROUNDS + 1):
            last = round_ == AGENT_ROUNDS  # na última ronda o modelo já não tem ferramentas: tem de responder
            reply = await _call_model(messages, not last)
            calls = (reply.get("tool_calls") or [])[:3]

            if not calls:
                text = clean(reply.get("content"), 1500)
                if not text:
                    return JSONResponse({"ok": False, "error": "vazio"}, status_code=502)
                await record_turn(conv_id, email, "assistant", text, lang)
                return JSONResponse({"ok": True, "text": text})

            messages.append({"role": "assistant", "content": reply.get("content"), "tool_calls": calls})
            for call in calls:
                function = call.get("function") or {}
                try:
                    args = json.loads(function.get("arguments") or "{}")
                    if not isinstance(args, dict):
                        args = {}
                except ValueError:
                    args = {}
                result = await run_tool(function.get("name") or "", args, key)
                messages.append({"role": "tool", "tool_call_id": call.get("id"), "content": str(result)[:4000]})
        return JSONResponse({"ok": False, "error": "rondas"}, status_code=502)
    except (httpx.HTTPError, RuntimeError) as err:
        print(f"[chat] {err}")
        return JSONResponse({"ok": False, "error": "upstream"}, status_code=502)
