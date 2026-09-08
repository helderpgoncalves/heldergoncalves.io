import pytest

from app import subscribers


@pytest.fixture(autouse=True)
async def _init():
    await subscribers.init_subscribers()


async def test_pending_then_active_lifecycle():
    email = "quem-subscreve@example.test"
    assert subscribers.status_of(email) is None
    await subscribers.mark_pending(email, "pt")
    assert subscribers.status_of(email) == "pending"
    assert await subscribers.mark_active(email) is True
    assert subscribers.status_of(email) == "active"


async def test_mark_active_without_pending_fails():
    assert await subscribers.mark_active("nunca-pediu@example.test") is False


async def test_mark_gone_removes_from_active():
    email = "quem-sai@example.test"
    await subscribers.mark_pending(email, "pt")
    await subscribers.mark_active(email)
    assert await subscribers.mark_gone(email) is True
    assert subscribers.status_of(email) == "gone"


def test_link_for_and_read_link_round_trip():
    link = subscribers.link_for("https://example.test", "confirm", "Alguem@Example.test")
    query = link.split("?", 1)[1]
    params = dict(p.split("=") for p in query.split("&"))
    from urllib.parse import unquote

    params = {k: unquote(v) for k, v in params.items()}
    assert subscribers.read_link("confirm", params) == "alguem@example.test"


def test_read_link_rejects_a_different_kind():
    link = subscribers.link_for("https://example.test", "confirm", "a@b.com")
    query = link.split("?", 1)[1]
    from urllib.parse import unquote

    params = {k: unquote(v) for k, v in (p.split("=") for p in query.split("&"))}
    # a mesma assinatura não vale para o outro tipo de ligação
    assert subscribers.read_link("unsubscribe", params) is None


def test_read_link_rejects_garbage():
    assert subscribers.read_link("confirm", {"e": "x", "t": "123", "s": "y"}) is None
    assert subscribers.read_link("confirm", {}) is None
