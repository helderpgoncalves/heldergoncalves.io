# ─────────────────────────────────────────────────────────────────────
# Rascunhos e publicar — só o dono, e publicar sem nunca falar com o
# GitHub a sério.
# ─────────────────────────────────────────────────────────────────────
import pytest

from tests.conftest import sign_in

HEADERS = {"Origin": "https://example.test", "Content-Type": "application/json"}
DRAFT = {"titulo": "Um teste", "descricao": "d", "tags": ["Meta", "meta", "escrita"], "lang": "pt", "corpo": "Olá."}


def test_listing_requires_the_owner(client):
    assert client.get("/api/escritos/rascunhos").status_code == 401
    sign_in(client, "alguem@example.test")
    assert client.get("/api/escritos/rascunhos").status_code == 403


def test_the_owner_creates_lists_and_updates_a_draft(client):
    sign_in(client, "dono@example.test")
    res = client.post("/api/escritos/rascunhos", json=DRAFT, headers=HEADERS)
    assert res.status_code == 200, res.text
    escrito = res.json()["escrito"]
    assert escrito["slug"] == "um-teste"  # derivado do título
    assert escrito["tags"] == ["meta", "escrita"]  # limpas e sem repetidos
    assert escrito["estado"] == "rascunho"

    listed = client.get("/api/escritos/rascunhos").json()
    assert listed["ok"] and listed["escritos"][0]["id"] == escrito["id"]
    assert listed["publicar"] is False

    res = client.post("/api/escritos/rascunhos", json={**DRAFT, "id": escrito["id"], "titulo": "Outro"}, headers=HEADERS)
    assert res.json()["escrito"]["titulo"] == "Outro"
    assert len(client.get("/api/escritos/rascunhos").json()["escritos"]) == 1


def test_a_bad_slug_or_language_is_rejected(client):
    sign_in(client, "dono@example.test")
    assert client.post("/api/escritos/rascunhos", json={**DRAFT, "slug": "Não Vale"}, headers=HEADERS).status_code == 400
    assert client.post("/api/escritos/rascunhos", json={**DRAFT, "lang": "fr"}, headers=HEADERS).status_code == 400


def test_removing_a_draft(client):
    sign_in(client, "dono@example.test")
    escrito = client.post("/api/escritos/rascunhos", json=DRAFT, headers=HEADERS).json()["escrito"]
    assert client.post("/api/escritos/rascunhos/remover", json={"id": escrito["id"]}, headers=HEADERS).status_code == 200
    assert client.post("/api/escritos/rascunhos/remover", json={"id": escrito["id"]}, headers=HEADERS).status_code == 404


def test_publishing_is_off_without_a_github_token(client):
    sign_in(client, "dono@example.test")
    escrito = client.post("/api/escritos/rascunhos", json=DRAFT, headers=HEADERS).json()["escrito"]
    assert client.post("/api/escritos/publicar", json={"id": escrito["id"]}, headers=HEADERS).status_code == 503


@pytest.fixture()
def fake_github(monkeypatch):
    calls = []

    async def fake_put(path, content, message):
        calls.append((path, content, message))
        return "abc123"

    monkeypatch.setattr("app.routers.escritos.GITHUB_READY", True)
    monkeypatch.setattr("app.routers.escritos.put_file", fake_put)
    return calls


def test_publishing_commits_the_markdown_and_marks_the_draft(client, fake_github):
    sign_in(client, "dono@example.test")
    escrito = client.post("/api/escritos/rascunhos", json=DRAFT, headers=HEADERS).json()["escrito"]
    res = client.post("/api/escritos/publicar", json={"id": escrito["id"]}, headers=HEADERS)
    assert res.status_code == 200, res.text
    assert res.json()["path"] == "src/content/blog/pt/um-teste.md"
    assert res.json()["escrito"]["estado"] == "publicado"
    assert res.json()["escrito"]["commit_sha"] == "abc123"

    path, content, message = fake_github[0]
    assert path == "src/content/blog/pt/um-teste.md"
    assert content.startswith("---\ntitle: 'Um teste'\n")
    assert content.endswith("Olá.\n")
    assert "Um teste" in message


def test_publishing_needs_a_title(client, fake_github):
    sign_in(client, "dono@example.test")
    escrito = client.post("/api/escritos/rascunhos", json={**DRAFT, "titulo": ""}, headers=HEADERS).json()["escrito"]
    assert client.post("/api/escritos/publicar", json={"id": escrito["id"]}, headers=HEADERS).status_code == 400
    assert fake_github == []


def test_a_github_failure_is_a_502_and_the_draft_stays_a_draft(client, monkeypatch):
    from app.github import PublishError

    async def refuse(path, content, message):
        raise PublishError(401)

    monkeypatch.setattr("app.routers.escritos.GITHUB_READY", True)
    monkeypatch.setattr("app.routers.escritos.put_file", refuse)
    sign_in(client, "dono@example.test")
    escrito = client.post("/api/escritos/rascunhos", json=DRAFT, headers=HEADERS).json()["escrito"]
    assert client.post("/api/escritos/publicar", json={"id": escrito["id"]}, headers=HEADERS).status_code == 502
    assert client.get("/api/escritos/rascunhos").json()["escritos"][0]["estado"] == "rascunho"
