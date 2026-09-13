# ─────────────────────────────────────────────────────────────────────
# A caixa de entrada da Mail — só o dono a lê, e só o dono responde.
#
# Três coisas a provar, e são as que partiriam alguma coisa a sério:
# que um visitante não alcança nenhuma das rotas novas, que o excerto da
# lista não leva a mensagem inteira, e que `/api/contact` guarda o que
# envia — porque é aí que a caixa de entrada se enche.
# ─────────────────────────────────────────────────────────────────────
import pytest

from conftest import sign_in, token_for

VISITANTE = "visitante@example.test"
DONO = "dono@example.test"

# Todas as rotas novas, com o método com que se alcançam. Uma rota nova
# acrescenta-se aqui — senão nasce sem o teste que prova que é do dono.
ROTAS = [
    ("get", "/api/mail"),
    ("get", "/api/mail/email:" + VISITANTE),
    ("post", "/api/mail/rascunho"),
    ("post", "/api/mail/responder"),
]


async def _escrever(email: str = VISITANTE, subject: str = "Olá", text: str = "Uma mensagem qualquer.") -> str:
    from app.contacto_store import PESSOA, conversation_id, record_message

    conv = conversation_id(email)
    await record_message(conv, email, PESSOA, subject, text)
    return conv


# ── Quem pode chegar lá ──────────────────────────────────────────────
@pytest.mark.parametrize("method,path", ROTAS)
def test_a_visitor_without_a_session_reaches_nothing(client, method, path):
    assert getattr(client, method)(path, json={}).status_code == 401


@pytest.mark.parametrize("method,path", ROTAS)
def test_a_signed_in_visitor_is_not_the_owner(client, method, path):
    sign_in(client, VISITANTE)
    res = getattr(client, method)(path, json={})
    assert res.status_code == 403
    assert res.json()["error"] == "dono"


async def test_the_owner_sees_who_wrote_and_the_whole_thread(client):
    conv = await _escrever(subject="Orçamento", text="Preciso de um agente para ler faturas.")

    sign_in(client, DONO)
    listed = client.get("/api/mail").json()["conversations"]
    linha = next(c for c in listed if c["conversation"] == conv)
    assert linha["email"] == VISITANTE
    assert linha["subject"] == "Orçamento"
    assert linha["messages"] == 1

    thread = client.get(f"/api/mail/{conv}").json()
    assert thread["ok"] is True
    assert thread["messages"][0]["text"] == "Preciso de um agente para ler faturas."


def test_an_unknown_conversation_is_a_404(client):
    sign_in(client, DONO)
    assert client.get("/api/mail/email:ninguem@example.test").status_code == 404


# ── O excerto é um excerto ───────────────────────────────────────────
async def test_the_preview_does_not_carry_the_whole_message(client):
    from app.config import LIMITS

    # Um corpo bem acima do tecto do excerto, com uma marca no fim: se a
    # marca chegar à lista, é a mensagem inteira que está a viajar.
    corpo = "palavra " * 400 + "MARCA-DO-FIM"
    conv = await _escrever(text=corpo)

    sign_in(client, DONO)
    linha = next(c for c in client.get("/api/mail").json()["conversations"] if c["conversation"] == conv)
    assert len(linha["preview"]) <= LIMITS.mail_preview
    assert "MARCA-DO-FIM" not in linha["preview"]
    # E a conversa aberta continua a trazer tudo — o corte é da lista.
    assert "MARCA-DO-FIM" in client.get(f"/api/mail/{conv}").json()["messages"][0]["text"]


# ── O que entra pela folha de escrever fica guardado ─────────────────
def test_contact_stores_what_it_sends(client, fake_mail, monkeypatch):
    from app.config import LIMITS
    from app.contacto_store import conversation_id, transcript

    monkeypatch.setattr(LIMITS, "token_min_age", 0)
    sign_in(client, VISITANTE)
    res = client.post(
        "/api/contact",
        json={
            "subject": "Uma proposta",
            "message": "Uma mensagem com mais de dez caracteres.",
            "token": token_for(client),
        },
    )
    assert res.status_code == 200
    assert len(fake_mail) == 1  # o email continua a sair como sempre

    guardadas = transcript(conversation_id(VISITANTE))
    assert len(guardadas) == 1
    assert guardadas[0]["subject"] == "Uma proposta"
    assert guardadas[0]["text"] == "Uma mensagem com mais de dez caracteres."
    assert guardadas[0]["role"] == "pessoa"


def test_the_owner_never_fills_his_own_inbox(client, fake_mail, monkeypatch):
    """O 403 `proprio` do contacto e a caixa de entrada são a mesma
    decisão: do lado do dono a Mail é para ler, não para escrever."""
    from app.config import LIMITS
    from app.contacto_store import conversation_id, transcript

    monkeypatch.setattr(LIMITS, "token_min_age", 0)
    sign_in(client, DONO)
    res = client.post(
        "/api/contact",
        json={"subject": "Nota", "message": "Uma mensagem com mais de dez caracteres.", "token": token_for(client)},
    )
    assert res.status_code == 403
    assert res.json()["error"] == "proprio"
    assert transcript(conversation_id(DONO)) == []
