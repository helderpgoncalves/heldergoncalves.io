import time

from app.security import bump, check_token, issue_token


def test_bump_allows_up_to_the_limit():
    key = "test:" + str(time.monotonic())
    assert bump(key, 60, 3) is True
    assert bump(key, 60, 3) is True
    assert bump(key, 60, 3) is True
    assert bump(key, 60, 3) is False  # o quarto já não cabe


def test_bump_is_independent_per_key():
    a, b = "a:" + str(time.monotonic()), "b:" + str(time.monotonic())
    assert bump(a, 60, 1) is True
    assert bump(b, 60, 1) is True  # a chave `b` não gasta a quota de `a`


def test_token_round_trip():
    fingerprint = "visitante-123"
    token = issue_token(fingerprint)
    assert check_token(token, fingerprint, min_age=0) is None


def test_token_rejects_wrong_fingerprint():
    token = issue_token("visitante-123")
    assert check_token(token, "outro-visitante", min_age=0) == "token"


def test_token_rejects_tampered_signature():
    token = issue_token("visitante-123")
    stamp, nonce, sig = token.split(".")
    tampered = f"{stamp}.{nonce}.{sig[:-1]}x"
    assert check_token(tampered, "visitante-123", min_age=0) == "token"


def test_token_enforces_minimum_age():
    token = issue_token("visitante-123")
    assert check_token(token, "visitante-123", min_age=3600) == "rapido"


def test_token_is_single_use_by_default():
    token = issue_token("visitante-123")
    assert check_token(token, "visitante-123", min_age=0) is None
    assert check_token(token, "visitante-123", min_age=0) == "repetido"


def test_token_can_be_reused_when_not_single_use():
    token = issue_token("visitante-123")
    assert check_token(token, "visitante-123", min_age=0, single_use=False) is None
    assert check_token(token, "visitante-123", min_age=0, single_use=False) is None


def test_token_malformed_is_rejected():
    assert check_token("nao-e-um-token", "x", min_age=0) == "token"
    assert check_token(None, "x", min_age=0) == "token"
