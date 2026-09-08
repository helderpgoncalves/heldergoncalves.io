# ─────────────────────────────────────────────────────────────────────
# GET /api/pessoas — quem já entrou, só o dono.
# ─────────────────────────────────────────────────────────────────────
from conftest import sign_in

from app import users_repo


def test_requires_a_session(client):
    res = client.get("/api/pessoas")
    assert res.status_code == 401


def test_rejects_a_non_owner_session(client):
    sign_in(client, "visitante@example.test")
    res = client.get("/api/pessoas")
    assert res.status_code == 403


def test_the_owner_sees_nobody_when_nobody_has_signed_in(client):
    sign_in(client, "dono@example.test")
    res = client.get("/api/pessoas")
    assert res.status_code == 200
    assert res.json() == {"ok": True, "people": []}


async def test_the_owner_sees_who_has_signed_in(client):
    await users_repo.record_visit("visitante@example.test")

    sign_in(client, "dono@example.test")
    people = client.get("/api/pessoas").json()["people"]
    assert len(people) == 1
    assert people[0]["email"] == "visitante@example.test"
    assert people[0]["visits"] == 1
