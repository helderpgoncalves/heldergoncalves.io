# ─────────────────────────────────────────────────────────────────────
# Uma cache pequena, em memória, com prazo.
#
# Cem visitantes a olhar para o mesmo título são um pedido ao Yahoo, não
# cem. E quando o Yahoo falha, uma resposta velha vale mais do que
# nenhuma: `remember` devolve o que tinha, mesmo passado o prazo, se
# calcular de novo rebentar.
# ─────────────────────────────────────────────────────────────────────
import threading
import time
from typing import Callable, TypeVar

T = TypeVar("T")

_lock = threading.Lock()
_store: dict[str, tuple[float, object]] = {}

# Acima disto deita-se fora o mais antigo: a memória é finita e a
# máquina é partilhada.
MAX_ENTRIES = 2000


def remember(key: str, ttl: float, compute: Callable[[], T]) -> T:
    """Devolve o valor guardado se ainda valer; senão calcula e guarda."""
    now = time.monotonic()
    with _lock:
        hit = _store.get(key)
    if hit and now - hit[0] < ttl:
        return hit[1]  # type: ignore[return-value]
    try:
        value = compute()
    except Exception:
        if hit:
            return hit[1]  # type: ignore[return-value]
        raise
    with _lock:
        _store[key] = (now, value)
        if len(_store) > MAX_ENTRIES:
            oldest = min(_store, key=lambda k: _store[k][0])
            _store.pop(oldest, None)
    return value
