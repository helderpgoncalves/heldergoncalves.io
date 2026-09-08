import pytest

from app import sessions


@pytest.fixture(autouse=True)
async def _init():
    await sessions.init_sessions()


def test_issue_and_verify_code():
    email = "alguem@example.test"
    code = sessions.issue_code(email)
    assert len(code) == 6 and code.isdigit()
    assert sessions.verify_code(email, code) is True


def test_a_code_is_single_use():
    email = "alguem@example.test"
    code = sessions.issue_code(email)
    assert sessions.verify_code(email, code) is True
    assert sessions.verify_code(email, code) is False


def test_wrong_code_is_rejected():
    email = "alguem@example.test"
    sessions.issue_code(email)
    assert sessions.verify_code(email, "000000") is False


def test_verify_without_a_pending_code_fails():
    assert sessions.verify_code("ninguem-pediu@example.test", "123456") is False


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
