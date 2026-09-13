# ─────────────────────────────────────────────────────────────────────
# Os Ficheiros — as pastas partilhadas entre o dono e cada cliente.
#
# O que interessa provar aqui é sobretudo quem vê o quê: uma pasta de um
# cliente não pode ser alcançável por outro, nem por quem adivinhe o
# `id`. O resto (formatos aceites, tectos, o aviso por email) vem a
# seguir.
#
# Nenhum teste manda email a sério — `avisos` guarda o que teria saído.
# ─────────────────────────────────────────────────────────────────────
import base64

import pytest
from conftest import sign_in

from app import ficheiros_store as loja
from app.config import FICHEIROS, LIMITS

PNG = b"\x89PNG\r\n\x1a\n" + b"0" * 64
PDF = b"%PDF-1.7\n" + b"0" * 64

DONO = "dono@example.test"
CLIENTE = "cliente@example.test"
OUTRO = "outro@example.test"


def dados(raw: bytes) -> str:
    return base64.b64encode(raw).decode()


@pytest.fixture(autouse=True)
def _loja_limpa():
    """O NDJSON e os bytes de um teste não sobrevivem para o seguinte —
    o mesmo princípio das outras lojas em `conftest.py`."""
    import shutil

    loja._pastas.clear()
    loja._ficheiros.clear()
    yield
    loja._pastas.clear()
    loja._ficheiros.clear()
    try:
        FICHEIROS.file.write_text("")
    except OSError:
        pass
    shutil.rmtree(FICHEIROS.blobs, ignore_errors=True)


@pytest.fixture()
def avisos(monkeypatch):
    saiu = []

    async def fake(*args, **kwargs):
        saiu.append(kwargs or args)
        return True

    monkeypatch.setattr("app.routers.ficheiros.send_mail", fake)
    return saiu


def cria_pasta(client, nome="Projecto", cliente=CLIENTE) -> str:
    sign_in(client, DONO)
    res = client.post("/api/ficheiros/pastas", json={"nome": nome, "cliente": cliente})
    assert res.status_code == 200, res.text
    return res.json()["pasta"]["id"]


def carrega(client, pasta, nome="nota.txt", raw=b"ola", lang="pt"):
    return client.post("/api/ficheiros/carregar", json={"pasta": pasta, "nome": nome, "dados": dados(raw), "lang": lang})


# ── Quem vê o quê ────────────────────────────────────────────────────
def test_sem_sessao_nao_ha_nada(client):
    assert client.get("/api/ficheiros").status_code == 401
    assert client.get("/api/ficheiros/pasta/seja-qual-for").status_code == 401
    assert client.get("/api/ficheiros/abrir/seja-qual-for").status_code == 401


def test_o_cliente_ve_so_as_pastas_dele(client):
    minha = cria_pasta(client, "A minha", CLIENTE)
    cria_pasta(client, "A de outro", OUTRO)

    sign_in(client, CLIENTE)
    corpo = client.get("/api/ficheiros").json()
    assert corpo["dono"] is False
    assert [p["id"] for p in corpo["pastas"]] == [minha]


def test_o_dono_ve_as_pastas_de_toda_a_gente(client):
    cria_pasta(client, "A minha", CLIENTE)
    cria_pasta(client, "A de outro", OUTRO)

    sign_in(client, DONO)
    corpo = client.get("/api/ficheiros").json()
    assert corpo["dono"] is True
    assert len(corpo["pastas"]) == 2


def test_a_pasta_de_outro_cliente_e_inexistente(client):
    pasta = cria_pasta(client, "A de outro", OUTRO)

    sign_in(client, CLIENTE)
    assert client.get(f"/api/ficheiros/pasta/{pasta}").status_code == 404


def test_so_o_dono_cria_pastas(client):
    sign_in(client, CLIENTE)
    res = client.post("/api/ficheiros/pastas", json={"nome": "Minha", "cliente": CLIENTE})
    assert res.status_code == 403


def test_uma_pasta_precisa_de_um_email_verdadeiro(client):
    sign_in(client, DONO)
    res = client.post("/api/ficheiros/pastas", json={"nome": "Projecto", "cliente": "isto-não-é-um-email"})
    assert res.status_code == 400


# ── Largar ficheiros ─────────────────────────────────────────────────
def test_o_cliente_larga_um_ficheiro_e_o_dono_e_avisado(client, avisos):
    pasta = cria_pasta(client)

    sign_in(client, CLIENTE)
    res = carrega(client, pasta, "planta.png", PNG)
    assert res.status_code == 200, res.text
    assert res.json()["ficheiro"]["tipo"] == "image/png"

    assert len(avisos) == 1
    assert avisos[0]["to"] == "helder@heldergoncalves.io"


def test_o_dono_larga_um_ficheiro_e_o_cliente_e_avisado(client, avisos):
    pasta = cria_pasta(client)

    sign_in(client, DONO)
    assert carrega(client, pasta, "proposta.pdf", PDF).status_code == 200

    assert len(avisos) == 1
    assert avisos[0]["to"] == CLIENTE


def test_um_cliente_nao_larga_nada_na_pasta_de_outro(client, avisos):
    pasta = cria_pasta(client, "A de outro", OUTRO)

    sign_in(client, CLIENTE)
    assert carrega(client, pasta).status_code == 404
    assert avisos == []


def test_svg_e_executaveis_ficam_de_fora(client, avisos):
    pasta = cria_pasta(client)
    sign_in(client, CLIENTE)
    for nome in ("desenho.svg", "instalador.exe", "correr.sh", "pagina.html"):
        res = carrega(client, pasta, nome, b"<svg/>")
        assert res.status_code == 400
        assert res.json()["error"] == "formato"


def test_a_assinatura_manda_sobre_a_extensao(client, avisos):
    pasta = cria_pasta(client)
    sign_in(client, CLIENTE)
    res = carrega(client, pasta, "afinal-nao-e.png", b"<svg xmlns='x'/>")
    assert res.status_code == 400
    assert res.json()["error"] == "formato"


def test_texto_passa_sem_assinatura_nenhuma(client, avisos):
    pasta = cria_pasta(client)
    sign_in(client, CLIENTE)
    assert carrega(client, pasta, "notas.md", b"# ola").status_code == 200


def test_um_ficheiro_grande_demais_e_recusado(client, avisos):
    pasta = cria_pasta(client)
    sign_in(client, CLIENTE)
    res = carrega(client, pasta, "enorme.txt", b"a" * (LIMITS.ficheiro_max + 1))
    assert res.status_code == 400


# ── Descarregar ──────────────────────────────────────────────────────
def test_descarregar_confere_a_sessao_a_cada_pedido(client, avisos):
    pasta = cria_pasta(client)
    sign_in(client, CLIENTE)
    ficheiro = carrega(client, pasta, "planta.png", PNG).json()["ficheiro"]["id"]

    # O mesmo URL, outra pessoa: não existe.
    sign_in(client, OUTRO)
    assert client.get(f"/api/ficheiros/abrir/{ficheiro}").status_code == 404

    sign_in(client, CLIENTE)
    res = client.get(f"/api/ficheiros/abrir/{ficheiro}")
    assert res.status_code == 200
    assert res.content == PNG
    assert res.headers["x-content-type-options"] == "nosniff"
    assert res.headers["content-disposition"].startswith("inline;")


def test_o_dono_descarrega_o_que_o_cliente_deixou(client, avisos):
    pasta = cria_pasta(client)
    sign_in(client, CLIENTE)
    ficheiro = carrega(client, pasta, "planta.png", PNG).json()["ficheiro"]["id"]

    sign_in(client, DONO)
    assert client.get(f"/api/ficheiros/abrir/{ficheiro}").status_code == 200


def test_o_que_nao_se_mostra_desce_como_anexo(client, avisos):
    pasta = cria_pasta(client)
    sign_in(client, CLIENTE)
    zipado = carrega(client, pasta, "entrega.zip", b"PK\x03\x04" + b"0" * 32).json()["ficheiro"]["id"]

    res = client.get(f"/api/ficheiros/abrir/{zipado}")
    assert res.headers["content-disposition"].startswith("attachment;")


def test_pedir_para_descarregar_forca_o_anexo(client, avisos):
    pasta = cria_pasta(client)
    sign_in(client, CLIENTE)
    ficheiro = carrega(client, pasta, "planta.png", PNG).json()["ficheiro"]["id"]

    res = client.get(f"/api/ficheiros/abrir/{ficheiro}?descarregar=1")
    assert res.headers["content-disposition"].startswith("attachment;")


def test_o_texto_sai_sempre_como_texto_simples(client, avisos):
    pasta = cria_pasta(client)
    sign_in(client, CLIENTE)
    ficheiro = carrega(client, pasta, "notas.md", b"# ola").json()["ficheiro"]["id"]

    res = client.get(f"/api/ficheiros/abrir/{ficheiro}")
    assert res.headers["content-type"].startswith("text/plain")


# ── Remover ──────────────────────────────────────────────────────────
def test_o_cliente_tira_o_que_pos_mas_nao_o_que_o_dono_deixou(client, avisos):
    pasta = cria_pasta(client)

    sign_in(client, DONO)
    do_dono = carrega(client, pasta, "proposta.pdf", PDF).json()["ficheiro"]["id"]
    sign_in(client, CLIENTE)
    meu = carrega(client, pasta, "planta.png", PNG).json()["ficheiro"]["id"]

    assert client.post("/api/ficheiros/remover", json={"id": do_dono}).status_code == 403
    assert client.post("/api/ficheiros/remover", json={"id": meu}).status_code == 200
    assert client.get(f"/api/ficheiros/abrir/{meu}").status_code == 404


def test_remover_a_pasta_leva_o_que_la_esta(client, avisos):
    pasta = cria_pasta(client)
    sign_in(client, CLIENTE)
    ficheiro = carrega(client, pasta, "planta.png", PNG).json()["ficheiro"]["id"]

    sign_in(client, DONO)
    assert client.post("/api/ficheiros/pastas/remover", json={"id": pasta}).status_code == 200

    sign_in(client, CLIENTE)
    assert client.get("/api/ficheiros").json()["pastas"] == []
    assert client.get(f"/api/ficheiros/abrir/{ficheiro}").status_code == 404


def test_os_bytes_desaparecem_mesmo_do_disco(client, avisos):
    pasta = cria_pasta(client)
    sign_in(client, CLIENTE)
    ficheiro = carrega(client, pasta, "planta.png", PNG).json()["ficheiro"]["id"]
    caminho = loja.caminho({"pasta": pasta, "id": ficheiro})
    assert caminho.is_file()

    client.post("/api/ficheiros/remover", json={"id": ficheiro})
    assert not caminho.exists()


def test_a_origem_errada_nao_entra(client, avisos):
    pasta = cria_pasta(client)
    sign_in(client, CLIENTE)
    res = client.post(
        "/api/ficheiros/carregar",
        json={"pasta": pasta, "nome": "nota.txt", "dados": dados(b"ola")},
        headers={"Origin": "https://outro-site.test"},
    )
    assert res.status_code == 403
