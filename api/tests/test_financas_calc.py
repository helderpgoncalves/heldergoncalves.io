# ─────────────────────────────────────────────────────────────────────
# As contas das Finanças, com números feitos à mão.
#
# É de propósito que os valores esperados estão escritos por extenso e
# não calculados no teste: um teste que repete a fórmula do código não
# prova nada. Aqui o que se prova é que 1000 € a 23 % dão 230 € de IVA e
# 250 € de retenção, e que ao Hélder chegam 980 € — que é a conta que
# interessa e a que toda a gente se engana.
#
# Tudo em cêntimos.
# ─────────────────────────────────────────────────────────────────────
from app.financas_calc import (
    aplica,
    irs_estimado,
    linha_fatura,
    previsao,
    resumo_ano,
    seguranca_social,
    trimestre_de,
)

# O caso por omissão de quem passa recibos verdes: regime simplificado,
# IVA 23 %, retenção 25 %, coeficiente 0,75.
TAXAS = {
    "iva": 0.23,
    "iva_isento": False,
    "retencao": 0.25,
    "retencao_dispensa": False,
    "coeficiente": 0.75,
    "ss_taxa": 0.214,
    "ss_base": 0.70,
    "ss_isencao_meses": 12,
    "atividade_inicio": "",
    "escaloes": [[805900, 0.13], [1216000, 0.165], [0, 0.48]],
}


def _fatura(data, base, iva, retencao, estado="emitida", cliente="c1"):
    return {"id": data, "cliente": cliente, "data": data, "base": base, "iva": iva, "retencao": retencao, "estado": estado}


# Jan 1000 €, paga; Fev 500 €, emitida; Mar 2000 €, em atraso. Dezembro
# de 2025 está lá para provar que não entra no ano de 2026.
FATURAS = [
    _fatura("2026-01-15", 100000, 23000, 25000, "paga"),
    _fatura("2026-02-10", 50000, 11500, 12500),
    _fatura("2026-03-05", 200000, 46000, 50000, "atraso", "c2"),
    _fatura("2025-12-01", 999900, 229977, 249975, "paga"),
]


# ── Uma fatura ───────────────────────────────────────────────────────
def test_mil_euros_a_23_por_cento_com_retencao_de_25():
    linha = linha_fatura(100000, TAXAS)
    assert linha["iva"] == 23000
    assert linha["retencao"] == 25000
    # O que vai escrito na fatura…
    assert linha["total"] == 123000
    # …e o que chega mesmo à conta: a retenção nunca lá chega.
    assert linha["receber"] == 98000


def test_isento_pelo_artigo_53_nao_leva_iva_e_o_motivo_vai_junto():
    linha = linha_fatura(100000, {**TAXAS, "iva_isento": True, "iva_motivo": "Artigo 53.º"})
    assert linha["iva"] == 0
    assert linha["total"] == 100000
    assert linha["receber"] == 75000
    assert linha["iva_motivo"] == "Artigo 53.º"


def test_com_dispensa_de_retencao_recebe_se_o_total():
    linha = linha_fatura(100000, {**TAXAS, "retencao_dispensa": True})
    assert linha["retencao"] == 0
    assert linha["receber"] == 123000


def test_meio_centimo_arredonda_para_cima_nao_para_o_par():
    """O `round()` do Python daria 2 — arredonda para o par mais próximo.
    Dinheiro não se arredonda assim."""
    assert aplica(5, 0.5) == 3


# ── O ano ────────────────────────────────────────────────────────────
def test_o_ano_separa_o_faturado_do_recebido():
    r = resumo_ano(FATURAS, 2026, TAXAS, objetivo=300000)
    assert r["faturado"] == 350000  # 1000 + 500 + 2000
    assert r["recebido"] == 98000  # só a de Janeiro está paga
    assert r["faturas"] == 3  # a de 2025 ficou de fora
    assert r["iva"]["valor"] == 80500
    assert r["iva"]["taxa"] == 0.23
    assert r["iva"]["sobre"] == 350000
    assert r["retido"]["valor"] == 87500


def test_o_que_esta_em_atraso_anda_a_parte():
    r = resumo_ano(FATURAS, 2026, TAXAS)
    assert r["atraso"]["faturas"] == 1
    assert r["atraso"]["valor"] == 196000  # 2000 + 460 de IVA − 500 de retenção


def test_a_variacao_contra_o_objetivo():
    assert resumo_ano(FATURAS, 2026, TAXAS, objetivo=300000)["variacao"] == 16.7
    # Sem objetivo não há comparação nenhuma a fazer, e não se inventa.
    assert resumo_ano(FATURAS, 2026, TAXAS)["variacao"] is None


def test_por_mes_e_por_cliente():
    r = resumo_ano(FATURAS, 2026, TAXAS)
    assert len(r["meses"]) == 12
    assert r["meses"][0] == {"mes": 1, "faturado": 100000, "recebido": 98000}
    assert r["meses"][1]["faturado"] == 50000
    assert r["meses"][1]["recebido"] == 0
    maior = r["clientes"][0]
    assert maior["cliente"] == "c2" and maior["faturado"] == 200000
    assert maior["atraso"] == 196000


# ── Segurança Social ─────────────────────────────────────────────────
def test_o_trimestre_paga_se_sobre_o_trimestre_anterior():
    ss = seguranca_social(FATURAS, 2026, 2, TAXAS)
    assert (ss["base_ano"], ss["base_trimestre"]) == (2026, 1)
    assert ss["faturado"] == 350000
    assert ss["relevante"]["valor"] == 245000  # 70 % de 3500 €
    assert ss["valor"]["valor"] == 52430  # 21,4 % de 2450 €
    assert ss["valor"]["taxa"] == 0.214


def test_o_primeiro_trimestre_olha_para_o_ano_anterior():
    ss = seguranca_social(FATURAS, 2026, 1, TAXAS)
    assert (ss["base_ano"], ss["base_trimestre"]) == (2025, 4)
    assert ss["faturado"] == 999900


def test_nos_primeiros_doze_meses_de_atividade_nao_se_paga():
    ss = seguranca_social(FATURAS, 2026, 2, {**TAXAS, "atividade_inicio": "2026-01-02"})
    assert ss["isento"] is True
    assert ss["valor"]["valor"] == 0
    # Passado o prazo, volta a pagar-se.
    tarde = seguranca_social(FATURAS, 2026, 2, {**TAXAS, "atividade_inicio": "2020-01-02"})
    assert tarde["isento"] is False and tarde["valor"]["valor"] == 52430


def test_trimestre_de_cada_mes():
    assert [trimestre_de(m) for m in (1, 3, 4, 6, 7, 9, 10, 12)] == [1, 1, 2, 2, 3, 3, 4, 4]


# ── IRS ──────────────────────────────────────────────────────────────
def test_o_coeficiente_do_simplificado_manda_no_rendimento():
    irs = irs_estimado(350000, 87500, TAXAS)
    assert irs["rendimento"]["valor"] == 262500  # 75 % de 3500 €
    assert irs["rendimento"]["taxa"] == 0.75
    # Tudo dentro do primeiro escalão: 13 % de 2625 €.
    assert irs["imposto"] == 34125
    assert len(irs["degraus"]) == 1
    # Já foi retido mais do que isto — o saldo é a favor de quem faturou.
    assert irs["saldo"] == -53375


def test_cada_escalao_paga_so_a_sua_fatia():
    """O erro com que toda a gente se assusta é julgar que se paga a taxa
    do último escalão sobre tudo. 10 000 € de rendimento: 8059 € a 13 %,
    e só os 1941 € seguintes a 16,5 %."""
    irs = irs_estimado(0, 0, TAXAS)
    assert irs["imposto"] == 0
    irs = irs_estimado(1333334, 0, {**TAXAS, "coeficiente": 0.75})
    assert irs["rendimento"]["valor"] == 1000001  # 75 % de 13 333,34 €
    assert [d["taxa"] for d in irs["degraus"]] == [0.13, 0.165]
    assert irs["degraus"][0]["valor"] == 104767  # 13 % de 8059 €
    assert irs["imposto"] == 104767 + irs["degraus"][1]["valor"]


# ── O que falta faturar ──────────────────────────────────────────────
AVENCAS = [
    {"id": "a1", "cliente": "c1", "valor": 50000, "inicio": "2026-01-01", "fim": ""},
    {"id": "a2", "cliente": "c2", "valor": 30000, "inicio": "2026-01-01", "fim": "2026-08-31"},
    {"id": "a3", "cliente": "c3", "valor": 90000, "inicio": "2026-01-01", "fim": "2025-12-31"},
]
FASES = [
    {"id": "f1", "projeto": "p1", "valor": 120000, "previsto": "2026-09-30", "faturada": False},
    {"id": "f2", "projeto": "p1", "valor": 80000, "previsto": "2026-03-01", "faturada": False},
    {"id": "f3", "projeto": "p1", "valor": 70000, "previsto": "2026-10-01", "faturada": True},
]


def test_a_avenca_e_contrato_e_a_fase_e_aposta_por_isso_vao_separadas():
    p = previsao(AVENCAS, FASES, 2026, desde_mes=7)
    # a1 corre até Dezembro (6 meses × 500 €); a2 acaba em Agosto
    # (2 meses × 300 €); a3 já acabou no ano anterior.
    assert p["contratado"] == 300000 + 60000
    # Só a fase de Setembro: a de Março já passou, a de Outubro já foi
    # faturada.
    assert p["previsto"] == 120000
    assert p["total"] == 480000
    assert [f["id"] for f in p["fases"]] == ["f1"]
    assert sorted(a["id"] for a in p["avencas"]) == ["a1", "a2"]
