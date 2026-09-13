# ─────────────────────────────────────────────────────────────────────
# A ida ao modelo.
#
# Um sítio só a falar com o OpenRouter. As Mensagens e o rascunho da
# Mail pedem exactamente a mesma coisa — uma resposta, com a mesma lista
# de modelos e os mesmos cabeçalhos — e duas cópias disto eram duas
# listas de fallbacks a divergirem em silêncio na primeira vez que
# alguém mexesse numa.
#
# Devolve a mensagem do modelo, como ela vem. Quem chama é que decide o
# que fazer com `content` e com `tool_calls`: isto não sabe se do outro
# lado há um agente com ferramentas ou um email por escrever.
# ─────────────────────────────────────────────────────────────────────
from typing import Optional

import httpx

from app.config import CHAT, SITE_ORIGIN

TIMEOUT = 35.0


async def call_model(messages: list[dict], max_tokens: int, tools: Optional[list] = None) -> dict:
    # `models` (não `model`) deixa o OpenRouter tentar o próximo da lista
    # sozinho se o primeiro estiver em baixo ou sobrecarregado — sem isto,
    # uma falha do modelo principal derrubava a conversa inteira.
    body: dict = {
        "models": [CHAT.model, *CHAT.fallback_models][:3],
        "max_tokens": max_tokens,
        "temperature": 0.3,
        "messages": messages,
    }
    if tools:
        body["tools"] = tools
        body["tool_choice"] = "auto"

    async with httpx.AsyncClient(timeout=TIMEOUT) as client:
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
