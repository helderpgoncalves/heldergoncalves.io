# ─────────────────────────────────────────────────────────────────────
# Publicar é um commit.
#
# O site é estático e refaz-se a cada push para `main` (ver DEPLOY.md);
# por isso publicar um escrito é escrever o ficheiro Markdown no
# repositório, e mais nada — o resto é o build de sempre. Usa-se a API
# de conteúdos do GitHub com um token que só vive em variáveis de
# ambiente (config.py). `httpx` já cá estava, e é assíncrono: nada aqui
# bloqueia o event loop enquanto o GitHub responde.
# ─────────────────────────────────────────────────────────────────────
import base64

import httpx

from app.config import GITHUB

API = "https://api.github.com"


class PublishError(Exception):
    """O GitHub não aceitou — o código HTTP diz porquê, o corpo nunca é
    mostrado a ninguém (pode ter detalhes do repositório)."""

    def __init__(self, status: int):
        super().__init__(f"github {status}")
        self.status = status


async def put_file(path: str, content: str, message: str) -> str:
    """Cria ou substitui `path` no ramo configurado. Devolve o SHA do
    commit que ficou. Substituir exige o SHA do ficheiro que lá está —
    por isso se pergunta primeiro."""
    url = f"{API}/repos/{GITHUB.repo}/contents/{path}"
    headers = {
        "Authorization": "Bearer " + GITHUB.token,
        "Accept": "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
    }
    async with httpx.AsyncClient(timeout=20) as client:
        existing = await client.get(url, headers=headers, params={"ref": GITHUB.branch})
        body = {
            "message": message,
            "content": base64.b64encode(content.encode("utf-8")).decode("ascii"),
            "branch": GITHUB.branch,
        }
        if existing.status_code == 200:
            body["sha"] = existing.json().get("sha")
        elif existing.status_code != 404:
            raise PublishError(existing.status_code)
        res = await client.put(url, headers=headers, json=body)
        if res.status_code not in (200, 201):
            raise PublishError(res.status_code)
        return res.json()["commit"]["sha"]
