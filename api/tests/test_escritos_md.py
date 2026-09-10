# ─────────────────────────────────────────────────────────────────────
# De um rascunho ao ficheiro Markdown — lógica pura, sem HTTP nem base
# de dados.
# ─────────────────────────────────────────────────────────────────────
from datetime import date

from app.escritos_md import file_path, slugify, to_markdown


def test_slugify_drops_accents_and_punctuation():
    assert slugify("Porque voltei a escrever") == "porque-voltei-a-escrever"
    assert slugify("  Ação: MCP & agentes!  ") == "acao-mcp-agentes"
    assert slugify("") == ""


def test_slugify_caps_the_length():
    assert len(slugify("a" * 200)) == 80


def test_to_markdown_matches_the_content_schema():
    md = to_markdown(
        {"titulo": "O'Reilly", "descricao": "Um resumo", "tags": ["meta", "escrita"], "chave": "k1", "corpo": "\n\nOlá.\n"},
        date(2026, 9, 10),
    )
    assert md == (
        "---\n"
        "title: 'O''Reilly'\n"
        "description: 'Um resumo'\n"
        "date: 2026-09-10\n"
        "tags: ['meta', 'escrita']\n"
        "key: 'k1'\n"
        "---\n"
        "\n"
        "Olá.\n"
    )


def test_to_markdown_without_key_or_tags():
    md = to_markdown({"titulo": "T", "descricao": "", "tags": [], "chave": None, "corpo": ""}, date(2026, 1, 2))
    assert "key:" not in md
    assert "tags: []" in md


def test_file_path_puts_the_language_in_the_folder():
    assert file_path({"lang": "en", "slug": "why"}) == "src/content/blog/en/why.md"
