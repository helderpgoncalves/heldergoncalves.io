# ─────────────────────────────────────────────────────────────────────
# As contas das Finanças. Só aritmética: nada de HTTP, nada de disco,
# nada de configuração lida daqui de dentro.
#
# É de propósito que este módulo não sabe de onde vêm as faturas nem as
# taxas — recebe-as como argumentos. É o que o torna verificável com
# números feitos à mão (`api/tests/test_financas_calc.py`), que é a
# única forma honesta de provar uma conta fiscal.
#
# **Dinheiro é sempre um inteiro em cêntimos.** Em vírgula flutuante,
# 0,1 + 0,2 não é 0,3: uma soma de faturas que não fecha ao cêntimo é um
# erro que ninguém encontra e em que toda a gente confia. Onde há uma
# taxa a aplicar, o arredondamento é meio cêntimo para cima — como o
# dinheiro se arredonda, e não como o `round()` do Python, que arredonda
# para o par mais próximo.
#
# **Cada número que sai daqui diz de onde veio**: a taxa que usou e a
# base sobre que a aplicou. Um total que não se consegue explicar não se
# mostra — está escrito em `docs/arquitetura.md`, e é a linha que separa
# uma ferramenta de gestão de uma declaração fiscal. Isto é a primeira;
# nunca é a segunda.
# ─────────────────────────────────────────────────────────────────────
from decimal import ROUND_HALF_UP, Decimal

# Os estados possíveis de uma fatura. «Emitida» é o que foi passado;
# «paga» é o que já entrou na conta; «atraso» é o que passou do prazo e
# ainda não entrou — e é o número que interessa a quem trabalha por
# conta própria, por isso anda sempre à parte.
ESTADOS = ("emitida", "paga", "atraso")
PAGA = "paga"
ATRASO = "atraso"


def aplica(base: int, taxa: float) -> int:
    """Uma taxa sobre uma base, em cêntimos, arredondada ao cêntimo."""
    if not base or not taxa:
        return 0
    return int((Decimal(base) * Decimal(str(taxa))).quantize(Decimal("1"), rounding=ROUND_HALF_UP))


def _conta(valor: int, taxa: float, sobre: int, **extra) -> dict:
    """Um número calculado e a sua justificação, sempre juntos. A frase
    que o explica escreve-se na língua de quem vê, do lado do cliente —
    aqui vão só as peças dela."""
    return {"valor": valor, "taxa": taxa, "sobre": sobre, **extra}


def _ano_mes(data: str) -> tuple[int, int]:
    """`"2026-03-14"` → `(2026, 3)`. Uma data que não tenha essa forma
    não pertence a ano nenhum, e fica de fora de todas as somas."""
    try:
        return int(data[0:4]), int(data[5:7])
    except (ValueError, TypeError, IndexError):
        return 0, 0


def trimestre_de(mes: int) -> int:
    return (mes - 1) // 3 + 1 if 1 <= mes <= 12 else 0


# ── Uma fatura ───────────────────────────────────────────────────────
def linha_fatura(base: int, taxas: dict) -> dict:
    """O desdobramento de uma fatura a partir do valor base.

    Corre-se **uma vez, quando a fatura nasce**, e o resultado fica
    guardado com ela. Não se recalcula: as taxas mudam de ano para ano, e
    uma fatura de há dois anos tem o IVA de há dois anos. Recalcular em
    cada leitura era reescrever o passado sempre que o Orçamento do
    Estado mexesse numa percentagem."""
    isento = bool(taxas.get("iva_isento"))
    taxa_iva = 0.0 if isento else float(taxas.get("iva") or 0.0)
    dispensa = bool(taxas.get("retencao_dispensa"))
    taxa_ret = 0.0 if dispensa else float(taxas.get("retencao") or 0.0)
    iva = aplica(base, taxa_iva)
    retencao = aplica(base, taxa_ret)
    return {
        "base": base,
        "iva": iva,
        "taxa_iva": taxa_iva,
        "iva_isento": isento,
        "iva_motivo": str(taxas.get("iva_motivo") or "") if isento else "",
        "retencao": retencao,
        "taxa_retencao": taxa_ret,
        # O que vai escrito na fatura…
        "total": base + iva,
        # …e o que chega mesmo à conta. A retenção nunca lá chega: é o
        # cliente que a entrega ao Estado em nome de quem faturou.
        "receber": base + iva - retencao,
    }


def _do_ano(faturas: list[dict], ano: int) -> list[dict]:
    return [f for f in faturas if _ano_mes(str(f.get("data", "")))[0] == ano]


def _receber(f: dict) -> int:
    return int(f.get("base", 0)) + int(f.get("iva", 0)) - int(f.get("retencao", 0))


# ── O ano ────────────────────────────────────────────────────────────
def resumo_ano(faturas: list[dict], ano: int, taxas: dict, objetivo: int = 0) -> dict:
    """Quanto se faturou, quanto entrou, quanto disso não é nosso.

    «Faturado» e «recebido» são duas colunas e nunca se somam na mesma:
    mostrar só o faturado é mentir sobre o dinheiro que existe."""
    doano = _do_ano(faturas, ano)
    faturado = sum(int(f.get("base", 0)) for f in doano)
    iva = sum(int(f.get("iva", 0)) for f in doano)
    retido = sum(int(f.get("retencao", 0)) for f in doano)
    pagas = [f for f in doano if f.get("estado") == PAGA]
    recebido = sum(_receber(f) for f in pagas)
    atraso = [f for f in doano if f.get("estado") == ATRASO]

    meses = [{"mes": m, "faturado": 0, "recebido": 0} for m in range(1, 13)]
    for f in doano:
        mes = _ano_mes(str(f.get("data", "")))[1]
        if not 1 <= mes <= 12:
            continue
        meses[mes - 1]["faturado"] += int(f.get("base", 0))
        if f.get("estado") == PAGA:
            meses[mes - 1]["recebido"] += _receber(f)

    por_cliente: dict[str, dict] = {}
    for f in doano:
        cid = str(f.get("cliente") or "")
        linha = por_cliente.setdefault(cid, {"cliente": cid, "faturado": 0, "recebido": 0, "atraso": 0, "faturas": 0})
        linha["faturado"] += int(f.get("base", 0))
        linha["faturas"] += 1
        if f.get("estado") == PAGA:
            linha["recebido"] += _receber(f)
        elif f.get("estado") == ATRASO:
            linha["atraso"] += _receber(f)

    return {
        "ano": ano,
        "faturado": faturado,
        "recebido": recebido,
        "faturas": len(doano),
        # O IVA liquidado no ano. Não é o que se entrega já — entrega-se
        # por período — mas é o que do faturado nunca foi nosso.
        "iva": _conta(iva, float(taxas.get("iva") or 0.0), faturado, isento=bool(taxas.get("iva_isento"))),
        "retido": _conta(retido, float(taxas.get("retencao") or 0.0), faturado),
        "atraso": {"valor": sum(_receber(f) for f in atraso), "faturas": len(atraso)},
        "objetivo": objetivo,
        # Quanto acima ou abaixo do objetivo, em pontos percentuais. Sem
        # objetivo não há comparação nenhuma a fazer — e não se inventa.
        "variacao": round((faturado - objetivo) / objetivo * 100, 1) if objetivo else None,
        "meses": meses,
        "clientes": sorted(por_cliente.values(), key=lambda c: c["faturado"], reverse=True),
    }


# ── Segurança Social ─────────────────────────────────────────────────
def seguranca_social(faturas: list[dict], ano: int, trimestre: int, taxas: dict) -> dict:
    """O que há a entregar num trimestre.

    A contribuição de um trimestre calcula-se sobre o que se faturou no
    trimestre **anterior** — é o desfasamento que apanha toda a gente
    desprevenida no primeiro ano, e por isso o trimestre que serviu de
    base vai na resposta."""
    anterior_ano, anterior_tri = (ano - 1, 4) if trimestre == 1 else (ano, trimestre - 1)
    meses = range((anterior_tri - 1) * 3 + 1, (anterior_tri - 1) * 3 + 4)
    faturado = 0
    for f in faturas:
        a, m = _ano_mes(str(f.get("data", "")))
        if a == anterior_ano and m in meses:
            faturado += int(f.get("base", 0))

    base_taxa = float(taxas.get("ss_base") or 0.0)
    taxa = float(taxas.get("ss_taxa") or 0.0)
    relevante = aplica(faturado, base_taxa)
    isento = _isento_ss(anterior_ano, anterior_tri, taxas)
    return {
        "ano": ano,
        "trimestre": trimestre,
        "base_ano": anterior_ano,
        "base_trimestre": anterior_tri,
        "faturado": faturado,
        # Duas contas encadeadas, e as duas se mostram: primeiro a
        # fração do faturado que conta, depois a taxa sobre ela.
        "relevante": _conta(relevante, base_taxa, faturado),
        "isento": isento,
        "valor": _conta(0 if isento else aplica(relevante, taxa), taxa, relevante),
    }


def _isento_ss(ano: int, trimestre: int, taxas: dict) -> bool:
    """A isenção dos primeiros meses de atividade. Sem data de abertura
    configurada não se assume isenção nenhuma: assumir que se está
    isento e não estar é a forma cara de errar."""
    inicio = str(taxas.get("atividade_inicio") or "")
    meses = int(taxas.get("ss_isencao_meses") or 0)
    a, m = _ano_mes(inicio)
    if not a or not meses:
        return False
    # O fim do trimestre que serviu de base, em meses desde o ano zero.
    fim = ano * 12 + trimestre * 3
    return fim <= a * 12 + m + meses


# ── IRS ──────────────────────────────────────────────────────────────
def irs_estimado(faturado: int, retido: int, taxas: dict) -> dict:
    """Uma **estimativa** do IRS do ano, no regime simplificado.

    Não é uma declaração e não tenta ser: não sabe de deduções, de
    despesas, de outros rendimentos nem do agregado familiar. O que faz
    é o caminho que se explica em três passos — coeficiente, escalões,
    menos o que já foi retido — e mostra os três."""
    coeficiente = float(taxas.get("coeficiente") or 0.0)
    rendimento = aplica(faturado, coeficiente)
    escaloes = taxas.get("escaloes") or ()
    imposto, degraus = _por_escaloes(rendimento, escaloes)
    return {
        "faturado": faturado,
        "rendimento": _conta(rendimento, coeficiente, faturado),
        "imposto": imposto,
        "degraus": degraus,
        "retido": retido,
        # Positivo: ainda há a pagar. Negativo: já foi retido a mais.
        "saldo": imposto - retido,
    }


def _por_escaloes(rendimento: int, escaloes) -> tuple[int, list[dict]]:
    """O imposto degrau a degrau. Cada escalão paga a sua taxa só sobre
    a fatia que lhe cabe — não é a taxa do último escalão aplicada a
    tudo, que é o erro com que toda a gente se assusta."""
    imposto = 0
    anterior = 0
    degraus: list[dict] = []
    for topo, taxa in escaloes:
        limite = rendimento if (not topo or topo > rendimento) else int(topo)
        fatia = limite - anterior
        if fatia <= 0:
            break
        parte = aplica(fatia, float(taxa))
        degraus.append({"ate": int(topo), "taxa": float(taxa), "sobre": fatia, "valor": parte})
        imposto += parte
        anterior = limite
        if anterior >= rendimento:
            break
    return imposto, degraus


# ── O que falta faturar ──────────────────────────────────────────────
def previsao(avencas: list[dict], fases: list[dict], ano: int, desde_mes: int) -> dict:
    """Quanto ainda há para faturar até ao fim do ano.

    As avenças são contrato — sabem-se ao cêntimo. As fases são datas
    previstas, que escorregam. Vão separadas porque não valem o mesmo, e
    quem olha tem direito a saber qual é qual."""
    contratado = 0
    linhas_avenca = []
    for a in avencas:
        valor = int(a.get("valor", 0))
        meses = _meses_restantes(a, ano, desde_mes)
        if not meses or not valor:
            continue
        contratado += valor * meses
        linhas_avenca.append({"id": a.get("id"), "cliente": a.get("cliente"), "valor": valor, "meses": meses})

    previsto = 0
    linhas_fase = []
    for f in fases:
        if f.get("faturada"):
            continue
        a, m = _ano_mes(str(f.get("previsto", "")))
        if a != ano or m < desde_mes:
            continue
        previsto += int(f.get("valor", 0))
        linhas_fase.append({"id": f.get("id"), "projeto": f.get("projeto"), "valor": int(f.get("valor", 0)), "previsto": f.get("previsto")})

    return {
        "desde_mes": desde_mes,
        "contratado": contratado,
        "previsto": previsto,
        "total": contratado + previsto,
        "avencas": linhas_avenca,
        "fases": linhas_fase,
    }


def _meses_restantes(avenca: dict, ano: int, desde_mes: int) -> int:
    """Quantas vezes esta avença ainda se fatura este ano. Uma avença
    sem fim marcado corre até Dezembro; uma que acaba a meio pára no mês
    em que acaba."""
    ini_a, ini_m = _ano_mes(str(avenca.get("inicio", "")))
    primeiro = max(desde_mes, ini_m if ini_a == ano else 1 if ini_a < ano else 13)
    ultimo = 12
    fim_a, fim_m = _ano_mes(str(avenca.get("fim", "")))
    if fim_a:
        if fim_a < ano:
            return 0
        if fim_a == ano:
            ultimo = fim_m
    return max(0, ultimo - primeiro + 1)
