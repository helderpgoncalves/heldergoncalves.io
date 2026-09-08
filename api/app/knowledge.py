# ─────────────────────────────────────────────────────────────────────
# O que o agente sabe.
#
# São os ficheiros .md da pasta knowledge/ e os escritos publicados.
# Editar um ficheiro e fazer deploy é tudo o que é preciso para o
# ensinar: não há código a mexer, nem prompt escondido no meio do
# Python. Ensinar-lhe um assunto novo é criar um .md.
# ─────────────────────────────────────────────────────────────────────
import json
import re
import unicodedata
from dataclasses import dataclass

from app.config import KNOWLEDGE_DIR, ROOT

KB_LIMIT = 48 * 1024

_HEADING_RE = re.compile(r"^#\s+(.+)$", re.MULTILINE)


@dataclass(frozen=True)
class Section:
    file: str
    title: str
    text: str


def _load_knowledge() -> list[Section]:
    out: list[Section] = []
    total = 0
    if not KNOWLEDGE_DIR.is_dir():
        return out
    names = sorted(
        p.name for p in KNOWLEDGE_DIR.iterdir() if p.suffix == ".md" and p.name.lower() != "readme.md"
    )
    for name in names:
        body = (KNOWLEDGE_DIR / name).read_text("utf-8").strip()
        if not body or total + len(body) > KB_LIMIT:
            continue
        total += len(body)
        heading = _HEADING_RE.search(body)
        title = heading.group(1).strip() if heading else name[:-3]
        out.append(Section(file=name, title=title, text=body))
    return out


def _load_posts() -> list[dict]:
    try:
        data = json.loads((ROOT / "posts.json").read_text("utf-8"))
    except (OSError, ValueError):
        return []
    posts = data.get("posts")
    return posts if isinstance(posts, list) else []


KNOWLEDGE = _load_knowledge()
POSTS = _load_posts()


def _words(value: str) -> list[str]:
    """Palavras com significado, sem acentos, para comparar à vontade."""
    folded = unicodedata.normalize("NFD", value.lower())
    folded = "".join(ch for ch in folded if unicodedata.category(ch) != "Mn")
    return [w for w in re.split(r"[^a-z0-9]+", folded) if len(w) > 2]


def _fold(value: str) -> str:
    folded = unicodedata.normalize("NFD", value.lower())
    return "".join(ch for ch in folded if unicodedata.category(ch) != "Mn")


def post_line(post: dict) -> str:
    return f"- {post['title']} ({post['date']}, {post['lang']}): {post['description']} — {post['url']}"


def search(query: str) -> str:
    """Procura nas secções e nos escritos. Devolve texto, não HTML."""
    terms = _words(query)[:12]
    if not terms:
        return "Sem termos de pesquisa."

    def score(haystack: str) -> int:
        h = _fold(haystack)
        return sum(1 for t in terms if t in h)

    def best(items, text_of, take):
        scored = [(score(text_of(item)), item) for item in items]
        scored = [(n, item) for n, item in scored if n > 0]
        scored.sort(key=lambda pair: pair[0], reverse=True)
        return [item for _, item in scored[:take]]

    sections = best(KNOWLEDGE, lambda k: k.title + " " + k.text, 2)
    posts = best(POSTS, lambda p: p["title"] + " " + p["description"] + " " + " ".join(p.get("tags", [])), 4)

    parts = [f"## {k.title}\n{k.text[:3000]}" for k in sections]
    if posts:
        parts.append("## Escritos relacionados\n" + "\n".join(post_line(p) for p in posts))
    return "\n\n".join(parts) if parts else "Nada encontrado sobre isso na base de conhecimento."


def knowledge_index() -> str:
    """O índice das secções, para o agente saber o que pode pedir."""
    return "\n".join(f"- {k.title} ({k.file})" for k in KNOWLEDGE)
