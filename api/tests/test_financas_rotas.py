# ─────────────────────────────────────────────────────────────────────
# As Finanças pela HTTP: o portão do dono, e o que se pode guardar.
#
# O primeiro bloco é o que mais importa — **nenhuma rota responde a quem
# não é dono**. Não é uma lista vazia nem um 200 sem dados: é 401 sem
# sessão e 403 com a sessão de outra pessoa, para um visitante nem sequer
# ficar a saber que isto existe.
# ─────────────────────────────────────────────────────────────────────
import base64

import pytest
from conftest import sign_in

DONO = "dono@example.test"
OUTRO = "visitante@example.test"
ORIGEM = {"origin": "https://example.test", "content-type": "application/json"}

# O mínimo que um leitor de PDF aceita como PDF — o que interessa é a
# assinatura, que é o que a app confere.
PDF = base64.b64encode(b"%PDF-1.7\n%\xe2\xe3\xcf\xd3\n").decode()


@pytest.fixture(autouse=True)
def _financas_vazias():
    """Cada teste começa e acaba sem linhas nenhumas — o NDJSON é
    append-only, e um `client` a seguir relê o ficheiro do disco.

    Leva as Ficheiros atrás: partilhar uma fatura escreve numa pasta
    partilhada, e essa pasta não pode sobreviver para o teste seguinte.
    """
    import shutil

    from app import ficheiros_store
    from app.config import FICHEIROS, FINANCAS
    from app.financas_store import TIPOS, _rows, _taxas

    def limpar():
        for tipo in TIPOS:
            _rows[tipo].clear()
        _taxas.clear()
        ficheiros_store._pastas.clear()
        ficheiros_store._ficheiros.clear()
        for alvo in (FINANCAS.file, FICHEIROS.file):
            try:
                alvo.write_text("")
            except OSError:
                pass
        shutil.rmtree(FICHEIROS.blobs, ignore_errors=True)

    limpar()
    yield
    limpar()


def _guardar(client, tipo, **campos):
    return client.post(f"/api/financas/guardar/{tipo}", json=campos, headers=ORIGEM)


# ── O portão ─────────────────────────────────────────────────────────
CAMINHOS_GET = ("/api/financas", "/api/financas/resumo")
CAMINHOS_POST = (
    "/api/financas/guardar/cliente",
    "/api/financas/remover/cliente",
    "/api/financas/taxas",
    "/api/financas/partilhar",
)


def test_sem_sessao_nenhuma_rota_responde(client):
    for caminho in CAMINHOS_GET:
        assert client.get(caminho).status_code == 401
    for caminho in CAMINHOS_POST:
        assert client.post(caminho, json={}, headers=ORIGEM).status_code == 401


def test_com_a_sessao_de_outra_pessoa_nenhuma_rota_responde(client):
    sign_in(client, OUTRO)
    for caminho in CAMINHOS_GET:
        res = client.get(caminho)
        assert res.status_code == 403 and res.json()["error"] == "dono"
    for caminho in CAMINHOS_POST:
        assert client.post(caminho, json={}, headers=ORIGEM).status_code == 403


def test_um_visitante_nao_ve_sequer_a_lista_vazia(client):
    """Responder 200 com uma lista vazia contava que a área existe. Não
    conta."""
    sign_in(client, OUTRO)
    assert "clientes" not in client.get("/api/financas").json()


# ── Guardar ──────────────────────────────────────────────────────────
def test_o_dono_cria_um_cliente_e_uma_fatura(client):
    sign_in(client, DONO)
    cliente = _guardar(client, "cliente", nome="Acme", email="acme@example.test").json()["linha"]
    assert cliente["nome"] == "Acme"

    fatura = _guardar(client, "fatura", cliente=cliente["id"], base=100000, data="2026-01-15").json()["linha"]
    # As contas fazem-se no servidor e ficam guardadas com a fatura.
    assert (fatura["iva"], fatura["retencao"], fatura["total"], fatura["receber"]) == (23000, 25000, 123000, 98000)

    tudo = client.get("/api/financas").json()
    assert [c["id"] for c in tudo["clientes"]] == [cliente["id"]]
    assert tudo["taxas"]["iva"] == 0.23
    # Nasce desligado: o Hélder não é isento de IVA.
    assert tudo["taxas"]["iva_isento"] is False


def test_uma_fatura_sem_base_ou_sem_data_nao_entra(client):
    sign_in(client, DONO)
    cliente = _guardar(client, "cliente", nome="Acme").json()["linha"]
    assert _guardar(client, "fatura", cliente=cliente["id"], data="2026-01-15").status_code == 400
    assert _guardar(client, "fatura", cliente=cliente["id"], base=1000, data="15/01/2026").status_code == 400
    assert _guardar(client, "fatura", cliente=cliente["id"], base=-1, data="2026-01-15").status_code == 400


def test_alterar_e_escrever_por_cima_pelo_id(client):
    sign_in(client, DONO)
    cliente = _guardar(client, "cliente", nome="Acme").json()["linha"]
    outra = _guardar(client, "cliente", id=cliente["id"], nome="Acme Lda").json()["linha"]
    assert outra["id"] == cliente["id"]
    assert len(client.get("/api/financas").json()["clientes"]) == 1


def test_remover_um_cliente_leva_o_que_pende_dele(client):
    sign_in(client, DONO)
    cliente = _guardar(client, "cliente", nome="Acme").json()["linha"]
    projeto = _guardar(client, "projeto", cliente=cliente["id"], nome="Site").json()["linha"]
    _guardar(client, "fase", projeto=projeto["id"], nome="Fase 1", valor=50000, previsto="2026-05-01")
    _guardar(client, "fatura", cliente=cliente["id"], base=100000, data="2026-01-15")

    res = client.post("/api/financas/remover/cliente", json={"id": cliente["id"]}, headers=ORIGEM)
    assert res.status_code == 200 and res.json()["removidas"] == 4
    tudo = client.get("/api/financas").json()
    assert tudo["clientes"] == [] and tudo["projetos"] == [] and tudo["fases"] == [] and tudo["faturas"] == []


# ── As taxas ─────────────────────────────────────────────────────────
def test_as_taxas_corrigem_se_e_valem_para_a_fatura_seguinte(client):
    sign_in(client, DONO)
    assert client.post("/api/financas/taxas", json={"iva": 0.06, "objetivo": 5000000}, headers=ORIGEM).status_code == 200
    cliente = _guardar(client, "cliente", nome="Acme").json()["linha"]
    fatura = _guardar(client, "fatura", cliente=cliente["id"], base=100000, data="2026-01-15").json()["linha"]
    assert fatura["iva"] == 6000
    assert client.get("/api/financas/resumo?ano=2026").json()["resumo"]["objetivo"] == 5000000


def test_uma_taxa_escrita_em_percentagem_e_recusada(client):
    """23 em vez de 0,23 transformava mil euros de base em vinte e três
    mil de IVA. Recusa-se aqui, não se explica depois."""
    sign_in(client, DONO)
    assert client.post("/api/financas/taxas", json={"iva": 23}, headers=ORIGEM).status_code == 400


# ── O resumo ─────────────────────────────────────────────────────────
def test_o_resumo_diz_de_onde_vem_cada_numero(client):
    sign_in(client, DONO)
    cliente = _guardar(client, "cliente", nome="Acme").json()["linha"]
    _guardar(client, "fatura", cliente=cliente["id"], base=100000, data="2026-01-15", estado="paga", pago_em="2026-02-01")
    dados = client.get("/api/financas/resumo?ano=2026").json()
    assert dados["estimativa"] is True
    assert dados["resumo"]["faturado"] == 100000
    assert dados["resumo"]["recebido"] == 98000
    # A taxa e a base andam sempre com o valor: um total que não se
    # consegue explicar não se mostra.
    assert dados["resumo"]["iva"] == {"valor": 23000, "taxa": 0.23, "sobre": 100000, "isento": False}
    assert dados["irs"]["rendimento"]["taxa"] == 0.75


def test_um_ano_que_nao_e_um_ano(client):
    sign_in(client, DONO)
    assert client.get("/api/financas/resumo?ano=abcd").status_code == 400
    assert client.get("/api/financas/resumo?ano=1500").status_code == 400


# ── A fatura que vai ao Finder do cliente ────────────────────────────
def test_partilhar_poe_o_pdf_na_pasta_do_cliente_e_desligar_tira_o(client):
    from app.ficheiros_store import ficheiros_de, pastas_de

    sign_in(client, DONO)
    cliente = _guardar(client, "cliente", nome="Acme", email="acme@example.test").json()["linha"]
    fatura = _guardar(client, "fatura", cliente=cliente["id"], base=100000, data="2026-01-15", numero="2026/1").json()["linha"]

    res = client.post("/api/financas/partilhar", json={"id": fatura["id"], "ligar": True, "pdf": PDF}, headers=ORIGEM)
    assert res.status_code == 200 and res.json()["linha"]["partilhada"] is True

    pastas = pastas_de("acme@example.test")
    assert [p["nome"] for p in pastas] == ["Faturas"]
    assert [f["nome"] for f in ficheiros_de(pastas[0]["id"])] == ["2026-1.pdf"]

    # Desligar tira o acesso; o registo da fatura fica.
    res = client.post("/api/financas/partilhar", json={"id": fatura["id"], "ligar": False}, headers=ORIGEM)
    assert res.status_code == 200 and res.json()["linha"]["partilhada"] is False
    assert ficheiros_de(pastas[0]["id"]) == []
    assert len(client.get("/api/financas").json()["faturas"]) == 1


def test_nao_se_partilha_o_que_nao_e_um_pdf(client):
    """A app não gera faturas: o que vai para a pasta do cliente é o
    documento do Portal das Finanças, e confere-se a assinatura."""
    sign_in(client, DONO)
    cliente = _guardar(client, "cliente", nome="Acme", email="acme@example.test").json()["linha"]
    fatura = _guardar(client, "fatura", cliente=cliente["id"], base=100000, data="2026-01-15").json()["linha"]
    falso = base64.b64encode(b"<html>nao sou uma fatura</html>").decode()
    res = client.post("/api/financas/partilhar", json={"id": fatura["id"], "ligar": True, "pdf": falso}, headers=ORIGEM)
    assert res.status_code == 400 and res.json()["error"] == "pdf"


def test_sem_email_do_cliente_nao_ha_pasta_a_que_a_fatura_pertenca(client):
    sign_in(client, DONO)
    cliente = _guardar(client, "cliente", nome="Acme").json()["linha"]
    fatura = _guardar(client, "fatura", cliente=cliente["id"], base=100000, data="2026-01-15").json()["linha"]
    res = client.post("/api/financas/partilhar", json={"id": fatura["id"], "ligar": True, "pdf": PDF}, headers=ORIGEM)
    assert res.status_code == 400 and res.json()["error"] == "email"
