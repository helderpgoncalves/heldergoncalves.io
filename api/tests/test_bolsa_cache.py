# ─────────────────────────────────────────────────────────────────────
# app/bolsa/cache.py — a cache em memória, e as cotações que sobrevivem
# a um reinício.
# ─────────────────────────────────────────────────────────────────────
import app.bolsa.cache as cache_module
from app.bolsa.cache import init_snapshot, remember


def _reset():
    cache_module._store.clear()
    cache_module._snapshot_file = None


def test_remember_computes_once_within_ttl():
    _reset()
    calls = []
    compute = lambda: calls.append(1) or "valor"
    assert remember("k", 60, compute) == "valor"
    assert remember("k", 60, compute) == "valor"
    assert len(calls) == 1


def test_remember_falls_back_to_stale_value_on_error():
    _reset()
    remember("k", 0.0001, lambda: "bom")
    import time

    time.sleep(0.001)

    def falha():
        raise RuntimeError("Yahoo fora do ar")

    assert remember("k", 0.0001, falha) == "bom"


def test_snapshot_persists_only_quotes(tmp_path):
    _reset()
    snapshot_file = tmp_path / "bolsa-cotacoes.json"
    init_snapshot(snapshot_file)

    remember("q:AAPL", 60, lambda: {"symbol": "AAPL", "price": 200})
    remember("d:AAPL", 60, lambda: {"summary": "não é uma cotação"})

    assert snapshot_file.exists()
    import json

    saved = json.loads(snapshot_file.read_text("utf-8"))
    assert list(saved.keys()) == ["q:AAPL"]
    assert saved["q:AAPL"]["price"] == 200


def test_init_snapshot_restores_quotes_after_restart(tmp_path):
    _reset()
    snapshot_file = tmp_path / "bolsa-cotacoes.json"
    init_snapshot(snapshot_file)
    remember("q:MSFT", 60, lambda: {"symbol": "MSFT", "price": 500})

    # Um "reinício": limpa a memória, mas o ficheiro continua no disco.
    cache_module._store.clear()
    init_snapshot(snapshot_file)

    calls = []
    value = remember("q:MSFT", 60, lambda: calls.append(1) or {"symbol": "MSFT", "price": 999})
    assert value == {"symbol": "MSFT", "price": 500}
    assert not calls  # não voltou a calcular: a cotação reposta ainda vale


def test_init_snapshot_without_file_does_not_raise(tmp_path):
    _reset()
    init_snapshot(tmp_path / "nao-existe.json")
    assert cache_module._store == {}
