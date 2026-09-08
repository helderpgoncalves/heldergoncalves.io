# ─────────────────────────────────────────────────────────────────────
# Quem já entrou — a versão Postgres. Contra a base de dados a sério
# (ver conftest.py: `_database`), nunca simulada.
# ─────────────────────────────────────────────────────────────────────
from app import users_repo


async def test_a_first_visit_creates_a_row():
    await users_repo.record_visit("alguem@example.test")
    people = await users_repo.list_people()
    assert len(people) == 1
    assert people[0]["email"] == "alguem@example.test"
    assert people[0]["visits"] == 1
    assert people[0]["first_seen"] == people[0]["last_seen"]
    assert people[0]["avatar_url"] is None


async def test_a_second_visit_increments_the_same_row():
    await users_repo.record_visit("alguem@example.test")
    await users_repo.record_visit("alguem@example.test")
    people = await users_repo.list_people()
    assert len(people) == 1
    assert people[0]["visits"] == 2


async def test_a_visit_with_an_avatar_saves_it():
    await users_repo.record_visit("alguem@example.test", "https://exemplo.test/foto.jpg")
    people = await users_repo.list_people()
    assert people[0]["avatar_url"] == "https://exemplo.test/foto.jpg"


async def test_a_visit_without_an_avatar_does_not_erase_one_already_saved():
    # a mesma conta entrou primeiro pela Google (tem foto), depois por
    # código (sem foto) — o código não pode apagar o que a Google deu.
    await users_repo.record_visit("alguem@example.test", "https://exemplo.test/foto.jpg")
    await users_repo.record_visit("alguem@example.test")
    people = await users_repo.list_people()
    assert people[0]["avatar_url"] == "https://exemplo.test/foto.jpg"
    assert people[0]["visits"] == 2


async def test_list_people_orders_by_most_recent_first():
    await users_repo.record_visit("primeiro@example.test")
    await users_repo.record_visit("segundo@example.test")
    await users_repo.record_visit("primeiro@example.test")  # volta a ser o mais recente
    emails = [p["email"] for p in await users_repo.list_people()]
    assert emails == ["primeiro@example.test", "segundo@example.test"]


async def test_list_people_is_empty_with_nobody_registered():
    assert await users_repo.list_people() == []
