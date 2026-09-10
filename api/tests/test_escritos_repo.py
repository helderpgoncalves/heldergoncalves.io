# ─────────────────────────────────────────────────────────────────────
# O caderno do dono, contra Postgres a sério (ver conftest.py).
# ─────────────────────────────────────────────────────────────────────
from app import escritos_repo

DRAFT = {"slug": "um-teste", "lang": "pt", "titulo": "Um teste", "descricao": "d", "tags": ["meta"], "chave": None, "corpo": "Olá."}


async def test_save_without_an_id_creates_a_draft():
    row = await escritos_repo.save(None, DRAFT)
    assert row["estado"] == "rascunho"
    assert row["titulo"] == "Um teste"
    assert row["tags"] == ["meta"]
    assert row["publicado_em"] is None
    assert (await escritos_repo.list_all())[0]["id"] == row["id"]


async def test_save_with_an_id_updates_and_ignores_unknown_fields():
    row = await escritos_repo.save(None, DRAFT)
    updated = await escritos_repo.save(row["id"], {"titulo": "Outro", "estado": "publicado", "commit_sha": "x"})
    assert updated["titulo"] == "Outro"
    assert updated["estado"] == "rascunho"
    assert updated["commit_sha"] is None
    assert len(await escritos_repo.list_all()) == 1


async def test_save_with_an_unknown_id_returns_none():
    assert await escritos_repo.save("00000000-0000-0000-0000-000000000000", DRAFT) is None
    assert await escritos_repo.save("nao-e-um-id", DRAFT) is None


async def test_publishing_marks_the_row_and_editing_makes_it_a_draft_again():
    row = await escritos_repo.save(None, DRAFT)
    published = await escritos_repo.mark_published(row["id"], "abc123")
    assert published["estado"] == "publicado"
    assert published["commit_sha"] == "abc123"
    assert published["publicado_em"] is not None
    again = await escritos_repo.save(row["id"], {"corpo": "Mudou."})
    assert again["estado"] == "rascunho"
    assert again["commit_sha"] == "abc123"


async def test_delete_removes_the_row_once():
    row = await escritos_repo.save(None, DRAFT)
    assert await escritos_repo.delete(row["id"]) is True
    assert await escritos_repo.delete(row["id"]) is False
    assert await escritos_repo.get(row["id"]) is None
