# ─────────────────────────────────────────────────────────────────────
# Os Ficheiros: as pastas que o dono partilha com cada cliente, e o que
# lá está dentro.
#
# Dois tipos de linha no mesmo NDJSON append-only de `chat_store.py` e
# `availability_store.py` — uma `pasta` (nome, e o email do cliente a
# quem pertence) e um `ficheiro` (em que pasta está, como se chama,
# quem o lá pôs). Nunca se reescreve o ficheiro: mudar de estado é
# acrescentar uma linha nova com o mesmo `id`, e a última ganha.
#
# Os bytes NÃO vivem aqui: vivem no disco, em `FICHEIROS.blobs`, numa
# pasta por pasta-de-partilha e um ficheiro por `id`. O nome verdadeiro
# fica só nos metadados — assim o nome que um cliente escolheu nunca
# toca no sistema de ficheiros, e não há travessia de caminho possível
# por muito criativo que ele seja. É também por isso que este módulo é
# o único sítio que sabe onde os bytes estão.
#
# Nada disto é servido estaticamente: quem lê um byte passa sempre por
# `routers/ficheiros.py`, que confere a sessão a cada pedido.
# ─────────────────────────────────────────────────────────────────────
import asyncio
import json
import re
import secrets
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

from app.config import FICHEIROS

_pastas: dict[str, dict] = {}
_ficheiros: dict[str, dict] = {}
_lock = asyncio.Lock()

# Os `id` são nossos (`token_urlsafe`), mas voltam do disco a cada
# arranque — e a partir daí entram num caminho. Conferir a forma antes
# de lá chegar é o que impede uma linha adulterada de apontar para fora
# da pasta dos dados.
_ID_RE = re.compile(r"^[A-Za-z0-9_-]{1,32}$")


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="milliseconds").replace("+00:00", "Z")


def _novo_id() -> str:
    return secrets.token_urlsafe(8)


def _load() -> None:
    try:
        raw = FICHEIROS.file.read_text("utf-8")
    except OSError:
        return
    for line in raw.split("\n"):
        if not line.strip():
            continue
        try:
            row = json.loads(line)
        except ValueError:
            continue  # uma linha estragada não deita a partilha abaixo
        if not isinstance(row, dict) or not isinstance(row.get("id"), str):
            continue
        if not _ID_RE.match(row["id"]):
            continue
        if row.get("kind") == "pasta":
            _pastas[row["id"]] = row
        elif row.get("kind") == "ficheiro" and _ID_RE.match(str(row.get("pasta", ""))):
            _ficheiros[row["id"]] = row


async def init_ficheiros_store() -> None:
    await asyncio.to_thread(_load)
    print(f"[ficheiros] {len(pastas_todas())} pastas partilhadas, {len(_activos(_ficheiros))} ficheiros")


def _append(row: dict) -> None:
    FICHEIROS.file.parent.mkdir(parents=True, exist_ok=True)
    with open(FICHEIROS.file, "a", encoding="utf-8") as fh:
        fh.write(json.dumps(row) + "\n")


async def _write(alvo: dict[str, dict], row: dict) -> None:
    alvo[row["id"]] = row
    async with _lock:
        await asyncio.to_thread(_append, row)


def _activos(alvo: dict[str, dict]) -> list[dict]:
    return [r for r in alvo.values() if r.get("status") == "ativo"]


# ── As pastas ────────────────────────────────────────────────────────
def _publica(pasta: dict) -> dict:
    """O que uma pasta mostra ao cliente. O email vai junto de propósito
    — é o dono que precisa de ver a quem atribuiu cada pasta, e o
    cliente só recebe as suas, onde o email é o dele."""
    dentro = ficheiros_de(pasta["id"])
    return {
        "id": pasta["id"],
        "nome": pasta["nome"],
        "cliente": pasta["cliente"],
        "at": pasta["at"],
        "ficheiros": len(dentro),
        # Quando a pasta mexeu pela última vez. É o que diz à app se há
        # coisa nova desde a última vez que esta pessoa cá veio — o
        # mesmo papel que o `last` de uma conversa (chat_store.py), e é
        # dele que sai o badge no ícone. Sem ficheiros, vale a criação:
        # uma pasta acabada de partilhar também é novidade.
        "ultimo": dentro[0]["at"] if dentro else pasta["at"],
    }


def pastas_todas() -> list[dict]:
    """Todas as pastas em vigor, mais recentes primeiro — a vista do dono."""
    return sorted((_publica(p) for p in _activos(_pastas)), key=lambda p: p["at"], reverse=True)


def pastas_de(email: str) -> list[dict]:
    """Só as pastas atribuídas a este email. É esta função que faz o
    cliente ver o que é dele e mais nada."""
    chave = email.strip().lower()
    return [p for p in pastas_todas() if p["cliente"] == chave]


def pasta(pasta_id: str) -> Optional[dict]:
    row = _pastas.get(pasta_id)
    return row if row and row.get("status") == "ativo" else None


async def criar_pasta(nome: str, cliente: str) -> dict:
    row = {
        "id": _novo_id(),
        "kind": "pasta",
        "nome": nome,
        "cliente": cliente.strip().lower(),
        "status": "ativo",
        "at": _now_iso(),
    }
    await _write(_pastas, row)
    return _publica(row)


async def remover_pasta(pasta_id: str) -> Optional[dict]:
    antes = pasta(pasta_id)
    if not antes:
        return None
    # Os ficheiros de dentro vão com ela: uma pasta removida que
    # deixasse os bytes no disco era uma partilha que continuava a
    # existir sem ninguém a ver.
    for row in ficheiros_de(pasta_id):
        await remover_ficheiro(row["id"])
    row = {**antes, "status": "removido", "at": _now_iso()}
    await _write(_pastas, row)
    return _publica(antes)


# ── Os ficheiros ─────────────────────────────────────────────────────
def _publico(row: dict) -> dict:
    return {
        "id": row["id"],
        "pasta": row["pasta"],
        "nome": row["nome"],
        "tipo": row["tipo"],
        "tamanho": row["tamanho"],
        "por": row["por"],
        "at": row["at"],
    }


def ficheiros_de(pasta_id: str) -> list[dict]:
    """O que está na pasta, mais recente primeiro."""
    rows = [r for r in _activos(_ficheiros) if r.get("pasta") == pasta_id]
    return sorted((_publico(r) for r in rows), key=lambda r: r["at"], reverse=True)


def ficheiro(ficheiro_id: str) -> Optional[dict]:
    row = _ficheiros.get(ficheiro_id)
    return _publico(row) if row and row.get("status") == "ativo" else None


def ocupacao(pasta_id: str) -> int:
    """Quantos bytes a pasta já leva — o tecto por pasta mede-se aqui."""
    return sum(r["tamanho"] for r in ficheiros_de(pasta_id))


def caminho(row: dict) -> Path:
    """Onde os bytes deste ficheiro estão. Os dois `id` já passaram por
    `_ID_RE`, e é isso que torna esta junção segura."""
    return FICHEIROS.blobs / row["pasta"] / row["id"]


def _escrever_bytes(destino: Path, dados: bytes) -> None:
    destino.parent.mkdir(parents=True, exist_ok=True)
    destino.write_bytes(dados)
    destino.chmod(0o600)


async def guardar_ficheiro(pasta_id: str, nome: str, tipo: str, dados: bytes, por: str) -> dict:
    """Escreve os bytes e só depois regista a linha: um registo sem
    bytes seria um ficheiro que a app mostra e ninguém consegue abrir."""
    row = {
        "id": _novo_id(),
        "kind": "ficheiro",
        "pasta": pasta_id,
        "nome": nome,
        "tipo": tipo,
        "tamanho": len(dados),
        "por": por.strip().lower(),
        "status": "ativo",
        "at": _now_iso(),
    }
    await asyncio.to_thread(_escrever_bytes, caminho(row), dados)
    await _write(_ficheiros, row)
    return _publico(row)


def _apagar_bytes(alvo: Path) -> None:
    try:
        alvo.unlink()
    except OSError:
        pass  # já não estava lá: o registo é que manda, e esse fica


async def remover_ficheiro(ficheiro_id: str) -> Optional[dict]:
    antes = _ficheiros.get(ficheiro_id)
    if not antes or antes.get("status") != "ativo":
        return None
    # O registo é append-only, os bytes não: quem remove um ficheiro
    # partilhado quer que ele desapareça, não que fique invisível.
    await asyncio.to_thread(_apagar_bytes, caminho(antes))
    row = {**antes, "status": "removido", "at": _now_iso()}
    await _write(_ficheiros, row)
    return _publico(antes)


def pode_ver(pasta_row: dict, email: str, dono: bool) -> bool:
    """O portão de leitura, num sítio só: o dono vê tudo, o cliente vê o
    que está atribuído ao email com que entrou."""
    return dono or pasta_row["cliente"] == email.strip().lower()
