# ─────────────────────────────────────────────────────────────────────
# O que cada peça das Finanças aceita de fora, e como se limpa.
#
# Fica à parte do router de propósito: um ficheiro que só valida não
# precisa de saber o que é um pedido HTTP, e o router que só encaminha
# não precisa de saber quantas casas tem um NIF. Também se testa sem
# levantar a aplicação.
#
# Nenhum texto passa daqui para dentro sem `one_line`/`clean` — a regra
# de `validation.py` vale aqui como em todo o lado, mesmo sendo o dono a
# escrever: o dono também cola texto vindo de sítios que não controla.
#
# **Dinheiro chega e sai em cêntimos, inteiro.** Ver `financas_calc.py`.
# ─────────────────────────────────────────────────────────────────────
import re
from typing import Optional

from app.config import LIMITS
from app.financas_calc import ESTADOS, linha_fatura
from app.validation import EMAIL_RE, clean, one_line

DIA_RE = re.compile(r"^\d{4}-\d{2}-\d{2}$")
ID_RE = re.compile(r"^[A-Za-z0-9_-]{1,32}$")
ESTADOS_PROJETO = ("ativo", "fechado")


def _id(valor: object) -> str:
    texto = one_line(valor, 40)
    return texto if ID_RE.match(texto) else ""


def _dia(valor: object) -> str:
    texto = one_line(valor, 10)
    return texto if DIA_RE.match(texto) else ""


def _valor(bruto: object) -> Optional[int]:
    """Cêntimos, inteiro, nunca negativo. Um `float` que venha do JSON
    arredonda-se aqui e mais em lado nenhum — deixar um meio cêntimo
    entrar era pôr a soma do ano a não fechar por uma razão que ninguém
    ia descobrir."""
    if isinstance(bruto, bool) or not isinstance(bruto, (int, float)):
        return None
    valor = int(round(bruto))
    if valor < 0 or valor > LIMITS.financas_valor:
        return None
    return valor


def valida(tipo: str, payload: dict, taxas: dict) -> tuple[Optional[dict], str]:
    """Os campos limpos de uma peça, ou o erro. Nunca as duas coisas."""
    if tipo == "cliente":
        return _cliente(payload)
    if tipo == "projeto":
        return _projeto(payload)
    if tipo == "fase":
        return _fase(payload)
    if tipo == "avenca":
        return _avenca(payload)
    if tipo == "fatura":
        return _fatura(payload, taxas)
    return None, "tipo"


def _cliente(p: dict) -> tuple[Optional[dict], str]:
    nome = one_line(p.get("nome"), LIMITS.financas_nome)
    if not nome:
        return None, "dados"
    # O email não é decoração: é a chave que liga esta ficha à pasta
    # partilhada nas Ficheiros. Sem ele não há fatura a chegar ao Finder
    # de ninguém — mas um cliente pode existir sem isso.
    email = one_line(p.get("email"), LIMITS.email).lower()
    if email and not EMAIL_RE.match(email):
        return None, "email"
    return {
        "nome": nome,
        "email": email,
        "nif": one_line(p.get("nif"), 20),
        "notas": clean(p.get("notas"), LIMITS.financas_notas),
    }, ""


def _projeto(p: dict) -> tuple[Optional[dict], str]:
    cliente = _id(p.get("cliente"))
    nome = one_line(p.get("nome"), LIMITS.financas_nome)
    if not cliente or not nome:
        return None, "dados"
    estado = one_line(p.get("estado"), 20) or "ativo"
    if estado not in ESTADOS_PROJETO:
        return None, "estado"
    return {"cliente": cliente, "nome": nome, "estado": estado}, ""


def _fase(p: dict) -> tuple[Optional[dict], str]:
    projeto = _id(p.get("projeto"))
    nome = one_line(p.get("nome"), LIMITS.financas_nome)
    valor = _valor(p.get("valor"))
    if not projeto or not nome or valor is None:
        return None, "dados"
    return {
        "projeto": projeto,
        "nome": nome,
        "valor": valor,
        # A data prevista escorrega, e é por isso que a previsão das
        # fases vai à parte da das avenças: uma é aposta, a outra é
        # contrato.
        "previsto": _dia(p.get("previsto")),
        "faturada": bool(p.get("faturada")),
    }, ""


def _avenca(p: dict) -> tuple[Optional[dict], str]:
    cliente = _id(p.get("cliente"))
    nome = one_line(p.get("nome"), LIMITS.financas_nome)
    valor = _valor(p.get("valor"))
    inicio = _dia(p.get("inicio"))
    if not cliente or not nome or valor is None or not inicio:
        return None, "dados"
    # Até 28: um dia 31 não existe em Fevereiro, e uma avença que salta
    # um mês por ano é uma avença que ninguém percebe.
    dia = p.get("dia")
    dia = int(dia) if isinstance(dia, int) and 1 <= dia <= 28 else 1
    return {
        "cliente": cliente,
        "nome": nome,
        "valor": valor,
        "dia": dia,
        "inicio": inicio,
        "fim": _dia(p.get("fim")),
    }, ""


def _fatura(p: dict, taxas: dict) -> tuple[Optional[dict], str]:
    cliente = _id(p.get("cliente"))
    base = _valor(p.get("base"))
    data = _dia(p.get("data"))
    if not cliente or base is None or not data:
        return None, "dados"
    estado = one_line(p.get("estado"), 20) or "emitida"
    if estado not in ESTADOS:
        return None, "estado"

    # As contas fazem-se aqui, uma vez, e ficam guardadas com a fatura.
    # Não se recalculam a cada leitura: as taxas mudam de ano para ano, e
    # uma fatura de há dois anos tem o IVA de há dois anos.
    linha = linha_fatura(base, taxas)
    # Excepto se vierem escritos: o documento a sério é o do Portal das
    # Finanças, e se ele disser outro cêntimo é ele que tem razão.
    for campo in ("iva", "retencao"):
        escrito = _valor(p.get(campo))
        if escrito is not None:
            linha[campo] = escrito
    linha["total"] = linha["base"] + linha["iva"]
    linha["receber"] = linha["total"] - linha["retencao"]

    return {
        **linha,
        "cliente": cliente,
        "projeto": _id(p.get("projeto")),
        "avenca": _id(p.get("avenca")),
        "numero": one_line(p.get("numero"), LIMITS.financas_numero),
        "data": data,
        "vence": _dia(p.get("vence")),
        "estado": estado,
        "pago_em": _dia(p.get("pago_em")) if estado == "paga" else "",
    }, ""


# ── As taxas ─────────────────────────────────────────────────────────
_TAXAS_FRACAO = ("iva", "retencao", "coeficiente", "ss_taxa", "ss_base")


def valida_taxas(p: dict) -> tuple[dict, str]:
    """O que o dono pode corrigir na app. Uma taxa é uma fração entre 0
    e 1 — 0,23, não 23: um `23` guardado como taxa transformava uma
    fatura de mil euros em vinte e três mil de IVA, e o número tem de ser
    recusado aqui, não explicado depois."""
    campos: dict = {}
    for chave in _TAXAS_FRACAO:
        if chave not in p:
            continue
        bruto = p.get(chave)
        if isinstance(bruto, bool) or not isinstance(bruto, (int, float)) or not 0 <= bruto <= 1:
            return {}, "taxa"
        campos[chave] = float(bruto)
    for chave in ("iva_isento", "retencao_dispensa"):
        if chave in p:
            campos[chave] = bool(p.get(chave))
    if "iva_motivo" in p:
        campos["iva_motivo"] = one_line(p.get("iva_motivo"), LIMITS.financas_notas)
    if "atividade_inicio" in p:
        campos["atividade_inicio"] = _dia(p.get("atividade_inicio"))
    if "ss_isencao_meses" in p:
        meses = p.get("ss_isencao_meses")
        if isinstance(meses, bool) or not isinstance(meses, int) or not 0 <= meses <= 120:
            return {}, "dados"
        campos["ss_isencao_meses"] = meses
    if "objetivo" in p:
        objetivo = _valor(p.get("objetivo"))
        if objetivo is None:
            return {}, "dados"
        campos["objetivo"] = objetivo
    if "escaloes" in p:
        escaloes, erro = _escaloes(p.get("escaloes"))
        if erro:
            return {}, erro
        campos["escaloes"] = escaloes
    return campos, ""


def _escaloes(bruto: object) -> tuple[list, str]:
    """`[[topo em cêntimos, taxa], …]`, com `0` no tecto do último — é
    esse que apanha tudo o que está acima."""
    if not isinstance(bruto, list) or len(bruto) > 20:
        return [], "dados"
    saida = []
    for degrau in bruto:
        if not isinstance(degrau, list) or len(degrau) != 2:
            return [], "dados"
        topo = _valor(degrau[0])
        taxa = degrau[1]
        if topo is None or isinstance(taxa, bool) or not isinstance(taxa, (int, float)) or not 0 <= taxa <= 1:
            return [], "taxa"
        saida.append([topo, float(taxa)])
    return saida, ""
