# ─────────────────────────────────────────────────────────────────────
# As Finanças do dono: clientes, projetos, fases, avenças e faturas.
#
# O mesmo NDJSON append-only de `chat_store.py`, `availability_store.py`
# e `ficheiros_store.py` — carrega-se ao arrancar, escreve-se sempre no
# fim, e **nunca se reescreve o ficheiro**. Alterar é acrescentar uma
# linha nova com o mesmo `id`, e a última ganha; remover é acrescentar
# uma linha com `status: "removido"`. O histórico fica, que é o que se
# quer de um registo de dinheiro: uma fatura que desapareceu sem rasto é
# uma fatura que ninguém consegue explicar a um contabilista.
#
# Tudo isto é do dono e só do dono. Nenhum destes dados é servido a mais
# ninguém — o portão está em `routers/financas.py`, e é `require_owner`.
#
# **Dinheiro em cêntimos, inteiro.** Ver `financas_calc.py` para o
# porquê.
# ─────────────────────────────────────────────────────────────────────
import asyncio
import json
import secrets
from datetime import datetime, timezone
from typing import Optional

from app.config import FINANCAS

# Um dicionário por tipo: o `id` é único dentro do tipo, e nunca entra
# num caminho de ficheiro — ao contrário dos Ficheiros, aqui não há
# bytes no disco a que um `id` adulterado pudesse dar acesso.
TIPOS = ("cliente", "projeto", "fase", "avenca", "fatura")

_rows: dict[str, dict[str, dict]] = {t: {} for t in TIPOS}
# As taxas que o dono corrigiu por cima das de `config.py`. Singleton:
# há uma linha só, e a última escrita é a que vale.
_taxas: dict = {}
_lock = asyncio.Lock()


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="milliseconds").replace("+00:00", "Z")


def _load() -> None:
    try:
        raw = FINANCAS.file.read_text("utf-8")
    except OSError:
        return
    for line in raw.split("\n"):
        if not line.strip():
            continue
        try:
            row = json.loads(line)
        except ValueError:
            continue  # uma linha estragada não deita as contas abaixo
        if not isinstance(row, dict):
            continue
        tipo = row.get("kind")
        if tipo == "taxas" and isinstance(row.get("taxas"), dict):
            _taxas.clear()
            _taxas.update(row["taxas"])
        elif tipo in TIPOS and isinstance(row.get("id"), str):
            _rows[tipo][row["id"]] = row


async def init_financas_store() -> None:
    await asyncio.to_thread(_load)
    quantos = {t: len(ativos(t)) for t in TIPOS}
    # Diz-se que aconteceu, nunca o quê: contam-se linhas, e não sai
    # daqui nem um nome de cliente nem um valor.
    print("[finanças] " + ", ".join(f"{quantos[t]} {t}s" for t in TIPOS))


def _append(row: dict) -> None:
    FINANCAS.file.parent.mkdir(parents=True, exist_ok=True)
    with open(FINANCAS.file, "a", encoding="utf-8") as fh:
        fh.write(json.dumps(row) + "\n")


async def _escrever(row: dict) -> None:
    async with _lock:
        await asyncio.to_thread(_append, row)


# ── Ler ──────────────────────────────────────────────────────────────
def ativos(tipo: str) -> list[dict]:
    """As linhas em vigor de um tipo, mais recentes primeiro."""
    if tipo not in _rows:
        return []
    linhas = [r for r in _rows[tipo].values() if r.get("status") == "ativo"]
    return sorted(linhas, key=lambda r: str(r.get("at") or ""), reverse=True)


def um(tipo: str, row_id: str) -> Optional[dict]:
    row = _rows.get(tipo, {}).get(row_id)
    return row if row and row.get("status") == "ativo" else None


def tudo() -> dict:
    """Tudo o que a app precisa numa ida ao servidor. São poucas
    centenas de linhas por ano — paginar isto era complicar uma coisa
    que cabe inteira num pedido."""
    return {t + "s": ativos(t) for t in TIPOS}


# ── Escrever ─────────────────────────────────────────────────────────
async def guardar(tipo: str, campos: dict, row_id: Optional[str] = None) -> Optional[dict]:
    """Cria uma linha, ou escreve uma versão nova da que tiver este `id`.

    A linha nova leva a anterior inteira por baixo — quem altera manda
    os campos que mudou, e o que não vem fica como estava. É o que
    deixa uma alteração ao valor de uma fatura não lhe apagar a
    partilha, e é também por isso que a linha escrita é sempre completa:
    o NDJSON tem de poder ler-se de trás para a frente sem juntar
    pedaços de linhas diferentes."""
    if tipo not in TIPOS:
        return None
    if row_id:
        antes = um(tipo, row_id)
        if not antes:
            return None
        row = {**antes, **campos, "id": row_id, "kind": tipo, "status": "ativo", "at": _now_iso()}
    else:
        row = {**campos, "id": secrets.token_urlsafe(8), "kind": tipo, "status": "ativo", "at": _now_iso()}
    _rows[tipo][row["id"]] = row
    await _escrever(row)
    return row


async def remover(tipo: str, row_id: str) -> Optional[dict]:
    antes = um(tipo, row_id)
    if not antes:
        return None
    row = {**antes, "status": "removido", "at": _now_iso()}
    _rows[tipo][row_id] = row
    await _escrever(row)
    return row


async def remover_em_cascata(tipo: str, row_id: str) -> int:
    """Remover um cliente leva os projetos, as avenças e as faturas
    dele; remover um projeto leva as fases e as faturas dele. Deixar
    filhos órfãos era deixar dinheiro somado a um nome que já não
    existe."""
    removidos = 0
    if not await remover(tipo, row_id):
        return 0
    removidos += 1
    filhos: list[tuple[str, str]] = []
    if tipo == "cliente":
        filhos = [("projeto", "cliente"), ("avenca", "cliente"), ("fatura", "cliente")]
    elif tipo == "projeto":
        filhos = [("fase", "projeto"), ("fatura", "projeto")]
    elif tipo == "avenca":
        filhos = [("fatura", "avenca")]
    for filho, campo in filhos:
        for linha in list(ativos(filho)):
            if linha.get(campo) == row_id:
                # Em cascata, não recursivo até ao fim: um projeto de um
                # cliente removido já apanha as suas fases nesta volta.
                if filho in ("projeto", "avenca"):
                    removidos += await remover_em_cascata(filho, linha["id"])
                elif await remover(filho, linha["id"]):
                    removidos += 1
    return removidos


# ── As taxas ─────────────────────────────────────────────────────────
# `config.py` dá o ponto de partida; o dono corrige-o na app e a
# correcção fica aqui, por cima. Os dois juntos são o que as contas
# usam — nunca um número escrito à mão dentro de uma função.
CAMPOS_TAXAS = (
    "iva",
    "iva_isento",
    "iva_motivo",
    "retencao",
    "retencao_dispensa",
    "coeficiente",
    "ss_taxa",
    "ss_base",
    "ss_isencao_meses",
    "atividade_inicio",
    "objetivo",
    "escaloes",
)


def taxas() -> dict:
    """As taxas em vigor: as de `config.py`, com o que o dono mudou por
    cima. É isto que se passa a `financas_calc` — e é a única fonte."""
    base = {
        "moeda": FINANCAS.moeda,
        "iva": FINANCAS.iva,
        "iva_isento": FINANCAS.iva_isento,
        "iva_motivo": FINANCAS.iva_motivo,
        "retencao": FINANCAS.retencao,
        "retencao_dispensa": FINANCAS.retencao_dispensa,
        "coeficiente": FINANCAS.coeficiente,
        "ss_taxa": FINANCAS.ss_taxa,
        "ss_base": FINANCAS.ss_base,
        "ss_isencao_meses": FINANCAS.ss_isencao_meses,
        "atividade_inicio": FINANCAS.atividade_inicio,
        "objetivo": FINANCAS.objetivo,
        "escaloes": [list(e) for e in FINANCAS.escaloes],
    }
    base.update({k: v for k, v in _taxas.items() if k in CAMPOS_TAXAS})
    return base


async def guardar_taxas(campos: dict) -> dict:
    """Guarda só o que é reconhecido. Um campo que não esteja em
    `CAMPOS_TAXAS` não entra — as contas leem um conjunto fechado de
    chaves, e uma chave inventada seria um valor que ninguém usa e que
    fica lá a dar a impressão de que muda alguma coisa."""
    _taxas.update({k: v for k, v in campos.items() if k in CAMPOS_TAXAS})
    await _escrever({"kind": "taxas", "taxas": dict(_taxas), "at": _now_iso()})
    print("[finanças] taxas alteradas pelo dono")
    return taxas()
