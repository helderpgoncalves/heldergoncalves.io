from urllib.parse import parse_qs, urlparse

import pytest

from app import sessions


@pytest.fixture(autouse=True)
async def _init():
    await sessions.init_sessions()


def _params_of(link: str) -> dict:
    return {k: v[0] for k, v in parse_qs(urlparse(link).query).items()}


def test_magic_link_round_trip():
    email = "alguem@example.test"
    link = sessions.magic_link_for(email)
    assert sessions.verify_magic_link(_params_of(link)) == email


def test_a_magic_link_is_single_use():
    email = "alguem@example.test"
    params = _params_of(sessions.magic_link_for(email))
    assert sessions.verify_magic_link(params) == email
    assert sessions.verify_magic_link(params) is None


def test_a_tampered_magic_link_is_rejected():
    params = _params_of(sessions.magic_link_for("alguem@example.test"))
    params["s"] = params["s"][:-1] + ("x" if params["s"][-1] != "x" else "y")
    assert sessions.verify_magic_link(params) is None


def test_a_magic_link_for_another_email_is_rejected():
    params = _params_of(sessions.magic_link_for("alguem@example.test"))
    # a assinatura vale para o email que a pediu, não para outro qualquer
    params_outro = _params_of(sessions.magic_link_for("outra-pessoa@example.test"))
    assert sessions.verify_magic_link({**params, "s": params_outro["s"]}) is None


def test_an_expired_magic_link_is_rejected():
    import time

    from app.config import AUTH

    email = "alguem@example.test"
    # Um `stamp` de fora da janela de validade, assinado como se fosse
    # genuíno — `AUTH` é `frozen`, não se lhe mexe para simular o tempo
    # a passar (ver config.py: só `Limits` é feito para isso).
    stale_stamp = str(int(time.time() * 1000) - (AUTH.magic_link_ttl + 5) * 1000)
    params = {
        "e": sessions._encode(email),
        "t": stale_stamp,
        "s": sessions._hmac(f"magic.{email}.{stale_stamp}"),
    }
    assert sessions.verify_magic_link(params) is None


def test_verify_magic_link_rejects_malformed_params():
    assert sessions.verify_magic_link({}) is None
    assert sessions.verify_magic_link({"e": "x", "t": "não-é-número", "s": "x"}) is None


def test_session_cookie_round_trip():
    email = "alguem@example.test"
    cookie_header = "hs=" + sessions.session_cookie(email).split(";")[0].split("=", 1)[1]
    assert sessions.read_session(cookie_header) == email


def test_read_session_rejects_a_tampered_cookie():
    email = "alguem@example.test"
    value = sessions.session_cookie(email).split(";")[0].split("=", 1)[1]
    tampered = "hs=" + value[:-1] + ("x" if value[-1] != "x" else "y")
    assert sessions.read_session(tampered) is None


def test_read_session_without_a_cookie_returns_none():
    assert sessions.read_session("") is None
    assert sessions.read_session("outracoisa=valor") is None


def test_clear_cookie_expires_immediately():
    assert "Max-Age=0" in sessions.clear_cookie()


def test_is_owner_matches_the_configured_email():
    # OWNER_EMAIL="dono@example.test" — ver conftest.py
    assert sessions.is_owner("dono@example.test") is True
    assert sessions.is_owner("Dono@Example.Test") is True  # sem distinguir maiúsculas


def test_is_owner_rejects_everyone_else():
    assert sessions.is_owner("visitante@example.test") is False
    assert sessions.is_owner(None) is False
    assert sessions.is_owner("") is False


# ── Entrar sobrevive a uma publicação ────────────────────────────────


def test_a_session_signed_with_an_old_secret_is_still_read(monkeypatch):
    """Trocar o segredo não deita fora quem estava dentro: o antigo
    continua a ler, e só o novo assina."""
    from app import sessions

    antigos = sessions._secrets
    velho = b"x" * 32
    novo = b"y" * 32
    try:
        sessions._secrets = [velho]
        cookie = sessions.session_cookie("alguem@example.test")
        valor = cookie.split(";", 1)[0]

        # A publicação seguinte assina com outro, e aceita o anterior.
        sessions._secrets = [novo, velho]
        assert sessions.read_session(valor) == "alguem@example.test"

        # Sem o anterior na lista, a sessão morre — que é o que
        # acontecia antes de haver `SESSION_SECRET_PREVIOUS`.
        sessions._secrets = [novo]
        assert sessions.read_session(valor) is None
    finally:
        sessions._secrets = antigos


def test_a_session_renews_itself_past_half_its_life(monkeypatch):
    from app import sessions
    from app.config import AUTH

    # Acabada de emitir, não se renova: seria um cookie novo a cada pedido.
    fresca = sessions.session_cookie("alguem@example.test").split(";", 1)[0]
    assert sessions.renewed_cookie(fresca) is None

    # Passado meio do prazo, o próximo pedido traz um cookie novo.
    monkeypatch.setattr(sessions.time, "time", lambda: __import__("time").time() + AUTH.session_ttl * 0.6)
    renovado = sessions.renewed_cookie(fresca)
    assert renovado and renovado.startswith(AUTH.cookie + "=")


def test_renewing_an_absent_or_broken_session_gives_nothing():
    from app import sessions

    assert sessions.renewed_cookie("") is None
    assert sessions.renewed_cookie("hs=nao.e.valido") is None
