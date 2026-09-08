# ─────────────────────────────────────────────────────────────────────
# Limpar o que vem de fora antes de lhe tocarmos.
#
# Regra: nenhum texto vindo do visitante chega a lado nenhum sem passar
# por `clean` ou `one_line`. É o único sítio onde isso se decide.
# ─────────────────────────────────────────────────────────────────────
import re


def _is_control(ch: str) -> bool:
    """Um carácter de controlo, menos a mudança de linha e o tab."""
    code = ord(ch)
    if ch in ("\n", "\t"):
        return False
    return code < 0x20 or code == 0x7F


def clean(value: object, max_len: int) -> str:
    if not isinstance(value, str):
        return ""
    stripped = "".join(ch for ch in value if not _is_control(ch))
    return stripped.strip()[:max_len]


def one_line(value: object, max_len: int) -> str:
    return re.sub(r"[\r\n]+", " ", clean(value, max_len))


EMAIL_RE = re.compile(
    r"^[^\s@<>\";,]{1,64}@[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?(\.[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)+$",
    re.IGNORECASE,
)

_ESCAPES = {"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"}
_ESCAPE_RE = re.compile("[&<>\"']")


def escape_html(value: object) -> str:
    return _ESCAPE_RE.sub(lambda m: _ESCAPES[m.group(0)], str(value))
