# ─────────────────────────────────────────────────────────────────────
# Uma cache pequena, em memória, com prazo.
#
# Cem visitantes a olhar para o mesmo título são um pedido ao Yahoo, não
# cem. E quando o Yahoo falha, uma resposta velha vale mais do que
# nenhuma: `remember` devolve o que tinha, mesmo passado o prazo, se
# calcular de novo rebentar.
#
# As cotações (`q:*`) sobrevivem a um reinício: gravadas em disco, lidas
# no arranque — para um deploy não devolver "a carregar…" ao primeiro
# visitante quando ainda há uma cotação de há um minuto perfeitamente
# boa. Gráficos, fichas e pesquisas não se guardam: mudam pouco (a
# ficha) ou pesam sem precisão (o gráfico) para valerem o disco.
# ─────────────────────────────────────────────────────────────────────
import json
import threading
import time
from pathlib import Path
from typing import Callable, Optional, TypeVar

T = TypeVar("T")

_lock = threading.Lock()
_store: dict[str, tuple[float, object]] = {}

# Acima disto deita-se fora o mais antigo: a memória é finita e a
# máquina é partilhada.
MAX_ENTRIES = 2000

_snapshot_file: Optional[Path] = None


def init_snapshot(file: Path) -> None:
    """Carrega as últimas cotações conhecidas, se as houver — chamado uma
    vez no arranque. `hit[0]` fica com o relógio de agora, não o de quando
    foram gravadas: o TTL normal decide se ainda valem; o que interessa
    aqui é só não começar vazio."""
    global _snapshot_file
    _snapshot_file = file
    try:
        raw = json.loads(file.read_text("utf-8"))
    except (OSError, ValueError):
        return
    if not isinstance(raw, dict):
        return
    now = time.monotonic()
    with _lock:
        for key, value in raw.items():
            _store.setdefault(key, (now, value))
    print(f"[bolsa] {len(raw)} cotações repostas da última sessão")


def _save_snapshot() -> None:
    if _snapshot_file is None:
        return
    with _lock:
        quotes = {k: v[1] for k, v in _store.items() if k.startswith("q:")}
    try:
        _snapshot_file.parent.mkdir(parents=True, exist_ok=True)
        _snapshot_file.write_text(json.dumps(quotes), "utf-8")
    except OSError:
        pass  # a cotação em memória continua a servir; o disco é só reforço


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
    if key.startswith("q:"):
        _save_snapshot()
    return value
