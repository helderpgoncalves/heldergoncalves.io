# ─────────────────────────────────────────────────────────────────────
# De um rascunho ao ficheiro Markdown que o Astro lê.
#
# O frontmatter tem de bater certo com `src/content.config.ts`: title,
# description, date, tags, key. Nada de YAML a sério — só strings entre
# plicas (uma plica dentro escreve-se dobrada) e uma lista de tags. É o
# subconjunto que se usa, e chega; uma dependência para escrever YAML
# não se justifica por cinco linhas.
# ─────────────────────────────────────────────────────────────────────
import re
import unicodedata
from datetime import date

SLUG_RE = re.compile(r"^[a-z0-9-]{1,80}$")
LANGS = ("pt", "en")


def slugify(value: str) -> str:
    """«Porque voltei a escrever» → `porque-voltei-a-escrever`. Sem
    acentos, sem maiúsculas, hífens no lugar do resto."""
    plain = unicodedata.normalize("NFKD", value or "").encode("ascii", "ignore").decode()
    plain = re.sub(r"[^a-z0-9]+", "-", plain.lower()).strip("-")
    return plain[:80].rstrip("-")


def _quoted(value: str) -> str:
    return "'" + (value or "").replace("'", "''") + "'"


def to_markdown(escrito: dict, when: date) -> str:
    """O ficheiro inteiro: frontmatter mais o corpo, a acabar em linha nova."""
    lines = [
        "---",
        "title: " + _quoted(escrito["titulo"]),
        "description: " + _quoted(escrito["descricao"]),
        "date: " + when.isoformat(),
        "tags: [" + ", ".join(_quoted(t) for t in escrito.get("tags") or []) + "]",
    ]
    if escrito.get("chave"):
        lines.append("key: " + _quoted(escrito["chave"]))
    lines.append("---")
    body = (escrito.get("corpo") or "").strip("\n")
    return "\n".join(lines) + "\n\n" + body + "\n"


def file_path(escrito: dict) -> str:
    """Onde o ficheiro vive no repositório."""
    return f"src/content/blog/{escrito['lang']}/{escrito['slug']}.md"
