# ─────────────────────────────────────────────────────────────────────
# Ler o corpo de um pedido, com um tecto.
#
# Regra: nenhum pedido é lido sem um limite de tamanho — passar do tecto
# é tratado como corpo inválido, nunca como uma leitura sem fim.
# ─────────────────────────────────────────────────────────────────────
import json
from typing import Optional

from starlette.requests import Request

from app.config import LIMITS


async def read_json(request: Request, cap: Optional[int] = None) -> Optional[dict]:
    """Lê o corpo e devolve o objecto JSON — ou None se não for um, ou se
    for maior do que o tecto."""
    limit = cap or LIMITS.body
    body = await request.body()
    if len(body) > limit:
        return None
    try:
        payload = json.loads(body) if body else None
    except ValueError:
        return None
    return payload if isinstance(payload, dict) else None
