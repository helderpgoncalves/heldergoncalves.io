# ─────────────────────────────────────────────────────────────────────
# As ferramentas do agente.
#
# São três, e são as mesmas para o modelo que responde nas Mensagens e
# para um agente de fora que chegue por MCP. Estão aqui, longe dos dois
# endpoints, para não haver duas versões da mesma coisa: acrescentar uma
# ferramenta é acrescentar uma entrada em TOOLS e um ramo em run_tool.
#
# Cada ferramenta devolve texto para o modelo ler. Nunca lança: uma
# falha é uma frase que diz o que correu mal e o que fazer a seguir.
# ─────────────────────────────────────────────────────────────────────
import httpx

from app.config import BOOKING, LIMITS, MAIL_READY
from app.mail import deliver_to_owner
from app.knowledge import search
from app.security import bump
from app.validation import EMAIL_RE, clean, one_line

EMAIL_DIRETO = "helder@heldergoncalves.io"

TOOLS = [
    {
        "type": "function",
        "function": {
            "name": "procurar",
            "description": (
                "Procura na base de conhecimento do Hélder e nos escritos publicados. Usa sempre isto "
                "antes de responder sobre projetos, disponibilidade, preços, ferramentas, o site ou textos."
            ),
            "parameters": {
                "type": "object",
                "properties": {"consulta": {"type": "string", "description": "Palavras-chave do que procuras."}},
                "required": ["consulta"],
                "additionalProperties": False,
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "marcar_reuniao",
            "description": (
                "Pede uma conversa com o Hélder. Só usar depois de teres nome, email e uma ideia do "
                "assunto — pergunta-os primeiro."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "nome": {"type": "string"},
                    "email": {"type": "string"},
                    "assunto": {"type": "string", "description": "O problema, em poucas palavras."},
                    "preferencia": {"type": "string", "description": "Quando dá jeito à pessoa. Opcional."},
                },
                "required": ["nome", "email", "assunto"],
                "additionalProperties": False,
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "enviar_mensagem",
            "description": "Envia uma mensagem por email ao Hélder. Só usar com o consentimento da pessoa e com o email dela.",
            "parameters": {
                "type": "object",
                "properties": {
                    "nome": {"type": "string"},
                    "email": {"type": "string"},
                    "mensagem": {"type": "string"},
                },
                "required": ["nome", "email", "mensagem"],
                "additionalProperties": False,
            },
        },
    },
]


async def _marcar_reuniao(nome: str, email: str, assunto: str, quando: str, key: str) -> str:
    if not bump("book:" + key, LIMITS.per_ip_window, 2):
        return "Já foram feitos pedidos que cheguem daqui. Sugere o email."

    if BOOKING.webhook:
        try:
            async with httpx.AsyncClient(timeout=8.0) as client:
                res = await client.post(
                    BOOKING.webhook,
                    json={"nome": nome, "email": email, "assunto": assunto, "quando": quando, "source": "heldergoncalves.io"},
                )
            if res.status_code < 300:
                print("[agente] pedido de reuniao registado")
                return f"Pedido registado. Diz à pessoa que o Hélder confirma por email para {email}."
        except httpx.HTTPError:
            pass  # cai para as alternativas

    if BOOKING.url:
        return f"Dá esta ligação à pessoa para escolher a hora: {BOOKING.url}"

    if MAIL_READY:
        try:
            message = f"{nome} quer falar contigo.\n\nAssunto: {assunto}"
            if quando:
                message += f"\nQuando lhe dá jeito: {quando}"
            sent = await deliver_to_owner(email, "Pedido de conversa: " + assunto, message)
            if sent:
                print("[agente] pedido de reuniao enviado por email")
                return f"Pedido enviado ao Hélder. Ele responde a {email}."
        except httpx.HTTPError:
            pass  # cai para o email direto

    return f"Não há agenda ligada. Diz à pessoa para escrever a {EMAIL_DIRETO}."


async def _enviar_mensagem(nome: str, email: str, mensagem: str, key: str) -> str:
    if len(mensagem) < 10:
        return "A mensagem é demasiado curta. Pede mais contexto à pessoa."
    if not MAIL_READY:
        return f"O envio não está ligado. Diz à pessoa para escrever a {EMAIL_DIRETO}."
    if not bump("msg:" + key, LIMITS.per_ip_window, LIMITS.per_ip):
        return "Já foram enviadas mensagens que cheguem daqui. Sugere o email."
    if not bump("msg:global", LIMITS.global_window, LIMITS.global_):
        return "Não é possível enviar agora. Sugere o email."

    try:
        sent = await deliver_to_owner(email, f"Mensagem de {nome} (assistente do site)", mensagem)
        if not sent:
            return f"Não consegui enviar. Diz à pessoa para escrever a {EMAIL_DIRETO}."
        print("[agente] mensagem entregue")
        return f"Mensagem entregue. O Hélder responde a {email}."
    except httpx.HTTPError:
        return f"Não consegui enviar. Diz à pessoa para escrever a {EMAIL_DIRETO}."


async def run_tool(name: str, args: dict, key: str) -> str:
    """Corre uma ferramenta. `key` é a impressão digital do visitante, para
    os limites — nunca o IP."""
    if name == "procurar":
        return search(clean(args.get("consulta"), 200))

    # As outras duas mandam email: sem um email válido não se faz nada.
    nome = one_line(args.get("nome"), 80)
    email = one_line(args.get("email"), LIMITS.email)
    if not EMAIL_RE.match(email):
        return "Email inválido. Pede o email correto à pessoa antes de tentar outra vez."

    if name == "marcar_reuniao":
        return await _marcar_reuniao(
            nome,
            email,
            one_line(args.get("assunto"), LIMITS.subject) or "Conversa",
            one_line(args.get("preferencia"), 120),
            key,
        )
    if name == "enviar_mensagem":
        return await _enviar_mensagem(nome, email, clean(args.get("mensagem"), LIMITS.message), key)
    return "Ferramenta desconhecida."
