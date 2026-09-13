# ─────────────────────────────────────────────────────────────────────
# A fatura que vai ao Finder do cliente.
#
# Cada fatura tem um interruptor: partilhar, ou não. Ao ligar, o PDF
# aparece na pasta «Faturas» desse cliente na app Ficheiros — **a mesma
# partilha que já existe** (`ficheiros_store.py`), não um mecanismo
# novo. O cliente entra com o email dele e está lá, ao lado do resto do
# que se troca com ele; a decisão de quem vê o quê continua a ser
# `pode_ver`, num sítio só.
#
# **O ficheiro é o PDF verdadeiro, emitido no Portal das Finanças.** A
# app não gera faturas e não é para gerar: um PDF com aspecto de fatura
# que não é a fatura legal dava duas versões do mesmo documento, e a que
# o cliente guardava era a errada. O que esta app guarda é o registo de
# gestão — valores, estado, prazos. O documento vem das Finanças.
#
# Por isso só entra PDF, e confere-se a assinatura: um `.pdf` que afinal
# é outra coisa não é a fatura de ninguém.
#
# Desligar a partilha tira o ficheiro da pasta do cliente. O registo da
# fatura fica — o que se desfaz é o acesso, não a contabilidade.
#
# Assunto próprio, ficheiro próprio: `financas_store.py` guarda linhas e
# não sabe o que é uma pasta partilhada, e é assim que se mantém.
# ─────────────────────────────────────────────────────────────────────
import base64
import binascii
from typing import Optional

from app import ficheiros_store as ficheiros
from app.config import FINANCAS, LIMITS

# A assinatura de um PDF a sério. Sem isto, a extensão era a única prova
# — e a extensão é escolhida por quem carrega o ficheiro.
ASSINATURA = b"%PDF-"
TIPO = "application/pdf"


def descodificar(raw: object) -> Optional[bytes]:
    """`data:application/pdf;base64,…` ou só o base64. Maior do que o
    tecto, ou base64 partido, é `None` — o mesmo contrato de
    `routers/ficheiros.py`, para não haver duas regras sobre a mesma
    coisa."""
    if not isinstance(raw, str) or not raw:
        return None
    corpo = raw.split(",", 1)[1] if raw.startswith("data:") else raw
    if len(corpo) > LIMITS.ficheiro_max * 4 // 3 + 1024:
        return None
    try:
        return base64.b64decode(corpo, validate=True)
    except (ValueError, binascii.Error):
        return None


def e_pdf(dados: bytes) -> bool:
    return bool(dados) and dados.startswith(ASSINATURA) and len(dados) <= LIMITS.ficheiro_max


async def pasta_de(email: str) -> Optional[str]:
    """O `id` da pasta «Faturas» deste cliente, criada se ainda não
    houver. O email é a chave que liga as duas coisas — é o mesmo campo
    que a pasta das Ficheiros usa."""
    chave = email.strip().lower()
    if not chave:
        return None
    for pasta in ficheiros.pastas_de(chave):
        if pasta["nome"] == FINANCAS.pasta_faturas:
            return pasta["id"]
    nova = await ficheiros.criar_pasta(FINANCAS.pasta_faturas, chave)
    return nova["id"]


async def partilhar(email: str, nome: str, dados: bytes, por: str) -> Optional[dict]:
    """Põe o PDF na pasta «Faturas» do cliente e devolve o ficheiro.

    `None` quando a pasta está cheia — o mesmo tecto por pasta das
    Ficheiros, porque é a mesma pasta."""
    pasta_id = await pasta_de(email)
    if not pasta_id:
        return None
    if len(ficheiros.ficheiros_de(pasta_id)) >= LIMITS.pasta_ficheiros:
        return None
    if ficheiros.ocupacao(pasta_id) + len(dados) > LIMITS.pasta_max:
        return None
    return await ficheiros.guardar_ficheiro(pasta_id, nome, TIPO, dados, por)


async def deixar_de_partilhar(ficheiro_id: str) -> bool:
    """Tira o ficheiro da pasta do cliente. Devolve `True` também quando
    já lá não estava: o que interessa a quem desliga o interruptor é o
    resultado — o cliente deixou de lhe chegar —, não se alguém já o
    tinha apagado pelas Ficheiros."""
    if not ficheiro_id:
        return True
    await ficheiros.remover_ficheiro(ficheiro_id)
    return True


def nome_do_ficheiro(numero: str, data: str) -> str:
    """Como a fatura se chama na pasta do cliente. O número é o que vem
    das Finanças; sem número, a data serve — o cliente tem de conseguir
    distinguir duas faturas sem as abrir."""
    base = (numero or data or "fatura").replace("/", "-").replace("\\", "-")
    return base[: LIMITS.ficheiro_nome - 4] + ".pdf"
