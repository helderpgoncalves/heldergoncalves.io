# ─────────────────────────────────────────────────────────────────────
# Entregar email.
#
# Dois caminhos, e o mesmo contrato para quem chama: `send_mail` devolve
# True se saiu, False se não. Acrescentar um terceiro fornecedor é
# acrescentar um ramo aqui e uma linha em config.py — mais nada no resto
# da API precisa de saber qual é.
# ─────────────────────────────────────────────────────────────────────
from typing import Optional

import httpx

from app.config import MAIL

TIMEOUT = 10.0


async def _via_resend(to: str, reply_to: Optional[str], subject: str, text: str) -> bool:
    async with httpx.AsyncClient(timeout=TIMEOUT) as client:
        res = await client.post(
            "https://api.resend.com/emails",
            headers={"Authorization": f"Bearer {MAIL.key}", "Content-Type": "application/json"},
            json={
                "from": MAIL.from_,
                "to": [to],
                **({"reply_to": reply_to} if reply_to else {}),
                "subject": subject,
                "text": text,
            },
        )
    return res.status_code < 300


async def _via_webhook(to: str, reply_to: Optional[str], subject: str, text: str) -> bool:
    async with httpx.AsyncClient(timeout=TIMEOUT) as client:
        res = await client.post(
            MAIL.webhook,
            json={
                "to": to,
                "from": reply_to or MAIL.from_,
                "subject": subject,
                "message": text,
                "source": "heldergoncalves.io",
            },
        )
    return res.status_code < 300


async def send_mail(subject: str, text: str, to: Optional[str] = None, reply_to: Optional[str] = None) -> bool:
    dest = to or MAIL.to
    try:
        if MAIL.provider == "resend":
            return await _via_resend(dest, reply_to, subject, text)
        return await _via_webhook(dest, reply_to, subject, text)
    except httpx.HTTPError:
        return False


async def deliver_to_owner(from_: str, subject: str, message: str) -> bool:
    """O caso mais comum: alguém escreve ao Hélder a partir do site."""
    return await send_mail(
        subject="[site] " + subject,
        text=f"Mensagem de heldergoncalves.io\n\nDe: {from_}\nAssunto: {subject}\n\n{message}\n",
        reply_to=from_,
    )
