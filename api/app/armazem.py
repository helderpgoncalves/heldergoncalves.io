# ─────────────────────────────────────────────────────────────────────
# Onde os bytes vivem.
#
# Duas implementações atrás do mesmo contrato — `guardar`, `ler`,
# `apagar` — e quem as chama não sabe qual está ligada:
#
#   disco  os ficheiros no `DATA_DIR`, um por chave. É o que corre por
#          omissão, e o que chega a um servidor só.
#   s3     qualquer coisa que fale S3. Localmente, o **Garage** (ver
#          docker-compose.dev.yml): é open source, é um binário, e não
#          traz nada atrás — a escolha certa para quem não quer montar
#          meia nuvem para guardar uns PDF. Em produção, o mesmo código
#          fala com o que lá estiver.
#
# **Sem dependência nova.** O S3 é HTTP com uma assinatura, e a
# assinatura (SigV4) são trinta linhas de `hmac` e `hashlib`, que já cá
# estavam por causa das sessões. Trazer o `boto3` — dezenas de
# megabytes, e um cliente síncrono a ter de correr em threads — para
# fazer três verbos é exactamente o que a primeira invariante proíbe.
#
# A chave é `<pasta>/<ficheiro>`, os dois já conferidos por quem chama
# (`ficheiros_store._ID_RE`): não há caminho a atravessar nem nome a
# escapar.
# ─────────────────────────────────────────────────────────────────────
import asyncio
import datetime
import hashlib
import hmac
from pathlib import Path
from typing import Optional
from urllib.parse import quote

import httpx

from app.config import ARMAZEM

VAZIO = hashlib.sha256(b"").hexdigest()
TIMEOUT = 20.0


# ── Disco ────────────────────────────────────────────────────────────
def _caminho(chave: str) -> Path:
    return ARMAZEM.pasta / chave


def _escrever(destino: Path, dados: bytes) -> None:
    destino.parent.mkdir(parents=True, exist_ok=True)
    destino.write_bytes(dados)
    destino.chmod(0o600)


def _apagar(alvo: Path) -> None:
    try:
        alvo.unlink()
    except OSError:
        pass  # já não estava lá: o registo é que manda, e esse fica


def _ler(alvo: Path) -> Optional[bytes]:
    try:
        return alvo.read_bytes()
    except OSError:
        return None


# ── S3 ───────────────────────────────────────────────────────────────
def _assinar(metodo: str, chave: str, sha: str, agora: datetime.datetime) -> tuple[str, dict]:
    """A assinatura da versão 4, no subconjunto que isto usa: um objeto
    de cada vez, sem parâmetros de consulta, sem várias partes.

    Devolve o URL e os cabeçalhos. O caminho é do estilo antigo
    (`/balde/chave`) e não o do subdomínio: é o que um armazém em casa
    serve, porque não há DNS por balde numa máquina só."""
    dia = agora.strftime("%Y%m%d")
    instante = agora.strftime("%Y%m%dT%H%M%SZ")
    escopo = f"{dia}/{ARMAZEM.regiao}/s3/aws4_request"

    base = ARMAZEM.endpoint.rstrip("/")
    caminho = "/" + ARMAZEM.balde + "/" + quote(chave, safe="/")
    anfitriao = base.split("://", 1)[1]

    cabecalhos = {"host": anfitriao, "x-amz-content-sha256": sha, "x-amz-date": instante}
    nomes = ";".join(sorted(cabecalhos))
    canonicos = "".join(f"{n}:{cabecalhos[n]}\n" for n in sorted(cabecalhos))
    pedido = f"{metodo}\n{caminho}\n\n{canonicos}\n{nomes}\n{sha}"

    a_assinar = f"AWS4-HMAC-SHA256\n{instante}\n{escopo}\n{hashlib.sha256(pedido.encode()).hexdigest()}"
    chave_assinatura = ("AWS4" + ARMAZEM.secreta).encode()
    for parte in (dia, ARMAZEM.regiao, "s3", "aws4_request"):
        chave_assinatura = hmac.new(chave_assinatura, parte.encode(), hashlib.sha256).digest()
    assinatura = hmac.new(chave_assinatura, a_assinar.encode(), hashlib.sha256).hexdigest()

    cabecalhos["Authorization"] = (
        f"AWS4-HMAC-SHA256 Credential={ARMAZEM.chave}/{escopo}, SignedHeaders={nomes}, Signature={assinatura}"
    )
    return base + caminho, cabecalhos


async def _s3(metodo: str, chave: str, dados: Optional[bytes] = None, tipo: str = "") -> Optional[httpx.Response]:
    sha = hashlib.sha256(dados).hexdigest() if dados is not None else VAZIO
    url, cabecalhos = _assinar(metodo, chave, sha, datetime.datetime.now(datetime.timezone.utc))
    if tipo:
        cabecalhos["content-type"] = tipo
    try:
        async with httpx.AsyncClient(timeout=TIMEOUT) as cliente:
            return await cliente.request(metodo, url, content=dados, headers=cabecalhos)
    except httpx.HTTPError as err:
        # Nunca o que era, nem para onde ia — só que não deu.
        print(f"[armazem] o armazém não respondeu ({type(err).__name__})")
        return None


# ── O contrato ───────────────────────────────────────────────────────
def em_disco() -> bool:
    """Quem serve um ficheiro precisa de saber: com disco dá para o
    entregar sem o ler para memória, e é o que se deve fazer."""
    return ARMAZEM.modo != "s3"


def caminho_local(chave: str) -> Optional[Path]:
    """O ficheiro no disco, se for aí que ele está — senão `None`."""
    if not em_disco():
        return None
    alvo = _caminho(chave)
    return alvo if alvo.is_file() else None


async def guardar(chave: str, dados: bytes, tipo: str) -> bool:
    if em_disco():
        await asyncio.to_thread(_escrever, _caminho(chave), dados)
        return True
    res = await _s3("PUT", chave, dados, tipo)
    return bool(res and res.status_code < 300)


async def ler(chave: str) -> Optional[bytes]:
    if em_disco():
        return await asyncio.to_thread(_ler, _caminho(chave))
    res = await _s3("GET", chave)
    return res.content if res and res.status_code < 300 else None


async def apagar(chave: str) -> None:
    if em_disco():
        await asyncio.to_thread(_apagar, _caminho(chave))
        return
    await _s3("DELETE", chave)
