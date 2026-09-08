# ─────────────────────────────────────────────────────────────────────
# O texto que a API mostra a quem o lê.
#
# São as poucas páginas e emails que não passam pelo Astro: a
# confirmação da subscrição, a saída da lista, o código de entrada e os
# emails das reuniões. Está tudo aqui para se poder mudar uma palavra
# sem abrir um ficheiro de lógica.
# ─────────────────────────────────────────────────────────────────────


def pick_lang(value: object) -> str:
    return "en" if value == "en" else "pt"


NEWSLETTER_COPY = {
    "pt": {
        "lang": "pt",
        "confirmSubject": "Confirma a subscrição do blog do Hélder",
        "confirmBody": lambda link, cancel: "\n".join(
            [
                "Olá,",
                "",
                "Alguém — provavelmente tu — pediu para receber os escritos novos de heldergoncalves.io.",
                "Para começar a receber, confirma aqui:",
                "",
                link,
                "",
                "Se não foste tu, ignora este email. Sem esta confirmação não te é enviado mais nada.",
                "A ligação vale durante sete dias.",
                "",
                "Podes sair da lista quando quiseres:",
                cancel,
                "",
                "Hélder Gonçalves",
                "https://heldergoncalves.io",
            ]
        ),
        "okTitle": "Subscrição confirmada",
        "okBody": "Está feito. Recebes um email quando houver escrito novo — e mais nada.",
        "goneTitle": "Subscrição cancelada",
        "goneBody": "Saíste da lista. Não te é enviado mais nada.",
        "badTitle": "Ligação inválida",
        "badBody": "Esta ligação não é válida ou já expirou. Podes subscrever outra vez a partir do blog.",
        "back": "Voltar ao site",
    },
    "en": {
        "lang": "en",
        "confirmSubject": "Confirm your subscription to Hélder's blog",
        "confirmBody": lambda link, cancel: "\n".join(
            [
                "Hello,",
                "",
                "Someone — probably you — asked to receive new writing from heldergoncalves.io.",
                "To start receiving it, confirm here:",
                "",
                link,
                "",
                "If this was not you, ignore this email. Without this confirmation nothing else is sent.",
                "The link is valid for seven days.",
                "",
                "You can leave the list whenever you want:",
                cancel,
                "",
                "Hélder Gonçalves",
                "https://heldergoncalves.io",
            ]
        ),
        "okTitle": "Subscription confirmed",
        "okBody": "Done. You will get an email when there is new writing — and nothing else.",
        "goneTitle": "Subscription cancelled",
        "goneBody": "You are off the list. Nothing else will be sent.",
        "badTitle": "Invalid link",
        "badBody": "This link is not valid or has expired. You can subscribe again from the blog.",
        "back": "Back to the site",
    },
}

AUTH_COPY = {
    "pt": {
        "subject": "O teu código para entrar em heldergoncalves.io",
        "body": lambda code: "\n".join(
            [
                "Olá,",
                "",
                "O teu código para entrar no Calendário é:",
                "",
                "    " + code,
                "",
                "Vale dez minutos, e uma vez só. Se não foste tu a pedir, ignora este email — sem o código não entra ninguém.",
                "",
                "Hélder Gonçalves",
                "https://heldergoncalves.io",
            ]
        ),
    },
    "en": {
        "subject": "Your code to sign in at heldergoncalves.io",
        "body": lambda code: "\n".join(
            [
                "Hello,",
                "",
                "Your code to sign in to the Calendar is:",
                "",
                "    " + code,
                "",
                "It is valid for ten minutes, once. If you did not ask for it, ignore this email — nobody gets in without the code.",
                "",
                "Hélder Gonçalves",
                "https://heldergoncalves.io",
            ]
        ),
    },
}


def _pt_meeting_owner_body(when: str, email: str, title: str, note: str) -> str:
    return "\n".join(
        ["Reunião nova marcada pelo site.", "", "Quando: " + when, "Com: " + email, "Assunto: " + (title or "—"), "", note or "(sem notas)", ""]
    )


def _en_meeting_owner_body(when: str, email: str, title: str, note: str) -> str:
    return "\n".join(
        ["New meeting booked from the site.", "", "When: " + when, "With: " + email, "Subject: " + (title or "—"), "", note or "(no notes)", ""]
    )


MEETING_COPY = {
    "pt": {
        "userSubject": lambda when: "Conversa marcada: " + when,
        "userBody": lambda when, title: "\n".join(
            [
                "Está marcado.",
                "",
                "Quando: " + when,
                ("Assunto: " + title) if title else "",
                "",
                "Vou enviar-te a ligação para a chamada um pouco antes. Se precisares de desmarcar, faz isso no Calendário do site — ou responde a este email.",
                "",
                "Hélder Gonçalves",
                "https://heldergoncalves.io",
            ]
        ),
        "ownerSubject": lambda when: "[agenda] Reunião marcada: " + when,
        "ownerBody": _pt_meeting_owner_body,
        "cancelSubject": lambda when: "[agenda] Reunião cancelada: " + when,
        "cancelBody": lambda when, email: f"A reunião de {when} com {email} foi cancelada pela pessoa.\n",
    },
    "en": {
        "userSubject": lambda when: "Meeting booked: " + when,
        "userBody": lambda when, title: "\n".join(
            [
                "It is booked.",
                "",
                "When: " + when,
                ("Subject: " + title) if title else "",
                "",
                "I will send you the call link shortly before. If you need to cancel, do it in the Calendar on the site — or reply to this email.",
                "",
                "Hélder Gonçalves",
                "https://heldergoncalves.io",
            ]
        ),
        "ownerSubject": lambda when: "[agenda] Meeting booked: " + when,
        "ownerBody": _en_meeting_owner_body,
        "cancelSubject": lambda when: "[agenda] Meeting cancelled: " + when,
        "cancelBody": lambda when, email: f"The meeting on {when} with {email} was cancelled by the person.\n",
    },
}
