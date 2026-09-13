# ─────────────────────────────────────────────────────────────────────
# Avisar a lista de que há escrito novo.
#
# Publicar é um commit (github.py); isto é o que acontece a seguir —
# um email por pessoa que confirmou a subscrição, na língua dela, com a
# ligação para o escrito e a de sair da lista.
#
# Corre FORA do pedido. Só há um processo `uvicorn` e um clique em
# «Publicar» não pode ficar à espera de trezentas voltas ao fornecedor
# de email: o endpoint arranca a tarefa e responde, e o resultado dela
# aparece nos logs. É também por isso que nada aqui pode rebentar — uma
# excepção numa tarefa solta morre em silêncio e levava o aviso com ela.
#
# O endereço do escrito calcula-se aqui, com as mesmas rotas do site
# (`src/config/routes.ts`): `/blog/<slug>/` em português, `/en/blog/…`
# em inglês. Se um dia mudarem lá, mudam aqui — é o preço de o servidor
# saber escrever uma ligação que o Astro é quem serve.
# ─────────────────────────────────────────────────────────────────────
import asyncio

from app.config import LIMITS, SITE_ORIGIN
from app.copy import ANNOUNCE_COPY, pick_lang
from app.mail import send_mail
from app.subscribers import active, link_for

# As tarefas a correr, para o recolector de lixo não levar nenhuma a
# meio: `create_task` sozinho só devolve uma referência fraca.
_running: set[asyncio.Task] = set()


def post_url(lang: str, slug: str, origin: str = SITE_ORIGIN) -> str:
    prefix = "/en/blog/" if pick_lang(lang) == "en" else "/blog/"
    return f"{origin.rstrip('/')}{prefix}{slug}/"


async def _send_all(lang: str, titulo: str, descricao: str, url: str, people: list[str]) -> None:
    copy = ANNOUNCE_COPY[pick_lang(lang)]
    subject = copy["subject"](titulo)
    sent = 0
    # Aos poucos, não todos de uma vez: `announce_batch` de cada vez
    # chega para não deixar o aviso a arrastar-se, e não atira com
    # centenas de ligações ao fornecedor no mesmo instante.
    for start in range(0, len(people), LIMITS.announce_batch):
        batch = people[start : start + LIMITS.announce_batch]
        results = await asyncio.gather(
            *(
                send_mail(
                    to=person,
                    subject=subject,
                    text=copy["body"](titulo, descricao, url, link_for(SITE_ORIGIN, "unsubscribe", person)),
                )
                for person in batch
            ),
            return_exceptions=True,
        )
        sent += sum(1 for r in results if r is True)
    # Quantos, nunca quem: um log não é sítio para emails de ninguém.
    print(f"[newsletter] aviso de escrito novo entregue a {sent} de {len(people)}")


async def announce(escrito: dict) -> int:
    """Arranca o aviso e devolve a quantas pessoas vai. Não espera pelo
    envio — quem chama está a responder a um pedido."""
    lang = pick_lang(escrito.get("lang"))
    people = active(lang)[: LIMITS.announce_max]
    if not people:
        print("[newsletter] escrito novo sem ninguém para avisar")
        return 0
    url = post_url(lang, escrito["slug"])
    task = asyncio.create_task(
        _send_all(lang, escrito["titulo"], escrito.get("descricao") or "", url, people)
    )
    _running.add(task)
    task.add_done_callback(_running.discard)
    return len(people)
