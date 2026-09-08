# ─────────────────────────────────────────────────────────────────────
# Todas as decisões que vêm de fora, num sítio só.
#
# Se uma variável de ambiente for lida em qualquer outro módulo, é um
# erro: quem quiser saber como se configura a API lê este ficheiro e
# mais nenhum, e quem acrescentar uma opção sabe onde a pôr.
# ─────────────────────────────────────────────────────────────────────
import os
from dataclasses import dataclass, field
from pathlib import Path


def _env(name: str, fallback: str = "") -> str:
    return os.environ.get(name) or fallback


PORT = int(_env("PORT", "3000"))
ROOT = Path(_env("STATIC_DIR", "./dist")).resolve()
KNOWLEDGE_DIR = Path(_env("KNOWLEDGE_DIR", "./knowledge")).resolve()
DATA_DIR = Path(_env("DATA_DIR", "./data")).resolve()
TRUST_PROXY = os.environ.get("TRUST_PROXY") != "0"
SITE_ORIGIN = _env("SITE_ORIGIN", "https://heldergoncalves.io").rstrip("/")


# ── Email ────────────────────────────────────────────────────────────
# Nenhuma chave chega ao browser: vive só aqui. Sem fornecedor
# configurado, o site volta ao `mailto:` e não se perde nada.
@dataclass(frozen=True)
class Mail:
    provider: str = _env("MAIL_PROVIDER").lower()  # 'resend' | 'webhook' | ''
    key: str = _env("RESEND_API_KEY")
    webhook: str = _env("MAIL_WEBHOOK_URL")
    to: str = _env("MAIL_TO", "helder@heldergoncalves.io")
    from_: str = _env("MAIL_FROM", "site@heldergoncalves.io")


MAIL = Mail()
MAIL_READY = (MAIL.provider == "resend" and len(MAIL.key) > 10) or (
    MAIL.provider == "webhook" and MAIL.webhook.startswith("https://")
)


# ── Conversa (OpenRouter) ────────────────────────────────────────────
# O modelo por omissão é o Claude Opus 5. Para gastar menos, troca-se
# aqui por variável de ambiente — ver DEPLOY.md.
@dataclass(frozen=True)
class Chat:
    key: str = _env("OPENROUTER_API_KEY")
    model: str = _env("OPENROUTER_MODEL", "anthropic/claude-opus-5")


CHAT = Chat()
CHAT_READY = len(CHAT.key) > 10
# Onde ficam as conversas — ver chat_store.py. Guardar isto é uma
# excepção deliberada ao resto do site (nenhum outro texto de visitante
# fica guardado); a política de privacidade diz-o, e é por isso que
# existe um sítio só para o assunto em vez de espalhado pelo código.
CHAT_LOG_FILE = Path(_env("CHAT_LOG_FILE", str(DATA_DIR / "conversas.ndjson"))).resolve()


# ── Marcação de conversas fora do Calendário ─────────────────────────
# Sem nada configurado, o agente encaminha para o email — que é o que o
# Hélder faria.
@dataclass(frozen=True)
class Booking:
    url: str = _env("BOOKING_URL")
    webhook: str = _env("BOOKING_WEBHOOK_URL")


BOOKING = Booking()


# ── Newsletter ───────────────────────────────────────────────────────
# A lista vive num ficheiro no disco. Precisa de um volume: sem ele, a
# lista desaparece no próximo arranque — ver DEPLOY.md.
@dataclass(frozen=True)
class Newsletter:
    file: Path = field(default_factory=lambda: Path(_env("SUBSCRIBERS_FILE", str(DATA_DIR / "subscribers.ndjson"))).resolve())
    # O segredo que assina as ligações de confirmação. Tem de sobreviver a
    # reinícios, senão as ligações que já foram enviadas deixam de valer.
    secret: str = _env("SUBSCRIBE_SECRET")
    # Quanto tempo uma ligação de confirmação continua a valer, em segundos.
    confirm_window: int = 7 * 24 * 60 * 60


NEWSLETTER = Newsletter()
NEWSLETTER_READY = MAIL_READY


# ── Comentários e reações nos escritos ───────────────────────────────
@dataclass(frozen=True)
class Comments:
    file: Path = field(default_factory=lambda: Path(_env("COMMENTS_FILE", str(DATA_DIR / "comentarios.ndjson"))).resolve())
    reactions_file: Path = field(
        default_factory=lambda: Path(_env("REACTIONS_FILE", str(DATA_DIR / "reacoes.ndjson"))).resolve()
    )
    body_max: int = 2000
    name_max: int = 80


COMMENTS = Comments()


# ── Sessões e reuniões ───────────────────────────────────────────────
# Entrar é um código por email — precisa do email ligado, como a
# newsletter. A agenda vale no fuso de Lisboa, seja quem for que marque.
@dataclass(frozen=True)
class Auth:
    secret: str = _env("SESSION_SECRET")
    cookie: str = "hs"
    code_ttl: int = 10 * 60
    session_ttl: int = 30 * 24 * 60 * 60


AUTH = Auth()
AUTH_READY = MAIL_READY

# O dono do Calendário: quem entra com este email vê a agenda cheia e
# pode gerir a disponibilidade. Sem esta variável, ninguém tem esse
# papel — o Calendário continua a funcionar só no modo de visitante.
OWNER_EMAIL = _env("OWNER_EMAIL").strip().lower()


# ── Entrar com a Google ──────────────────────────────────────────────
# Um segundo caminho para a mesma sessão de sempre — `session_cookie`,
# em sessions.py, não sabe nem quer saber por onde a pessoa entrou. Ao
# contrário do código por email, não precisa de `MAIL_READY`: não manda
# nada, só confirma quem é a pessoa com a própria Google.
@dataclass(frozen=True)
class Google:
    client_id: str = _env("GOOGLE_CLIENT_ID")
    client_secret: str = _env("GOOGLE_CLIENT_SECRET")


GOOGLE = Google()
GOOGLE_READY = len(GOOGLE.client_id) > 10 and len(GOOGLE.client_secret) > 10
GOOGLE_REDIRECT_URI = SITE_ORIGIN + "/api/auth/google/callback"


@dataclass(frozen=True)
class Meetings:
    file: Path = field(default_factory=lambda: Path(_env("MEETINGS_FILE", str(DATA_DIR / "meetings.ndjson"))).resolve())
    # As alterações que o dono faz à disponibilidade — bloqueios e
    # aberturas — por cima das janelas fixas abaixo.
    availability_file: Path = field(
        default_factory=lambda: Path(_env("AVAILABILITY_FILE", str(DATA_DIR / "availability.ndjson"))).resolve()
    )
    tz: str = _env("MEETINGS_TZ", "Europe/Lisbon")
    # Dias da semana (1 = segunda … 5 = sexta, 0 ou 7 = domingo) e as
    # janelas do dia em que o Hélder aceita conversas.
    days: str = _env("MEETINGS_DAYS", "1-5")
    windows: str = _env("MEETINGS_WINDOWS", "10:00-12:00,15:00-18:00")
    minutes: int = int(_env("MEETING_MINUTES", "30"))
    horizon_days: int = int(_env("MEETINGS_HORIZON_DAYS", "60"))
    notice_hours: int = int(_env("MEETINGS_NOTICE_HOURS", "12"))


MEETINGS = Meetings()


# ── Limites ──────────────────────────────────────────────────────────
# Tudo o que se mede está aqui, em segundos. Nenhum número mágico
# espalhado pelo código: quem quiser apertar ou alargar mexe num sítio.
#
# Não é `frozen`, ao contrário dos outros — de propósito: os testes
# afinam um limite ou outro (p.ex. `token_min_age`) sem esperar pelo
# relógio a sério. Em produção, ninguém lhe mexe depois do arranque.
@dataclass
class Limits:
    body: int = 8 * 1024
    message: int = 4000
    subject: int = 160
    email: int = 160

    per_ip: int = 3
    per_ip_window: int = 15 * 60
    global_: int = 40
    global_window: int = 60 * 60

    token_per_ip: int = 40
    token_window: int = 10 * 60
    token_min_age: float = 3.5
    token_max_age: int = 45 * 60

    # Subscrever é barato mas não é de graça: cada pedido manda um email.
    sub_per_ip: int = 3
    sub_per_ip_window: int = 60 * 60
    sub_global: int = 120
    sub_global_window: int = 60 * 60
    sub_token_min_age: float = 1.2

    # Conversa: o custo é real, por isso os limites são a sério.
    chat_body: int = 16 * 1024
    chat_turn: int = 600
    chat_total: int = 4000
    chat_history: int = 8
    chat_out_tokens: int = 400
    chat_per_ip: int = 15
    chat_per_ip_window: int = 60 * 60
    chat_per_ip_day: int = 50
    chat_day_window: int = 24 * 60 * 60
    chat_global_day: int = 600

    mcp_per_ip: int = 60

    # Sessões: cada pedido de código é um email; as tentativas são poucas.
    auth_per_ip: int = 5
    auth_per_ip_window: int = 60 * 60
    auth_global: int = 200
    auth_global_window: int = 60 * 60
    auth_verify_per_ip: int = 15
    auth_verify_window: int = 15 * 60
    auth_tries: int = 5

    # Entrar com a Google: só o pedido do `state` e a troca do código —
    # não há tentativas para limitar, é a Google que faz essa parte.
    google_start_per_ip: int = 20
    google_start_window: int = 15 * 60

    # Comentários: mais raros do que mensagens de contacto, mas com o
    # mesmo espírito — poucos por IP, um teto global.
    comment_per_ip: int = 5
    comment_per_ip_window: int = 60 * 60
    comment_global: int = 80
    comment_global_window: int = 60 * 60
    comments_per_post: int = 200  # o que se devolve de uma vez, no máximo

    # Reações: um toque, não um formulário — o limite é generoso.
    reaction_per_ip: int = 60
    reaction_per_ip_window: int = 10 * 60

    # Reuniões: a agenda é leve de ler, e marcar é raro.
    agenda_per_ip: int = 120
    agenda_window: int = 10 * 60
    book_per_ip: int = 10
    book_window: int = 60 * 60
    book_per_user_day: int = 3
    meeting_note: int = 1000

    # Bolsa: cada pedido pode trazer vários títulos, e a cache faz o resto.
    stocks_per_request: int = 12
    stocks_per_ip: int = 120
    stocks_per_ip_window: int = 10 * 60
    stocks_global: int = 3000
    stocks_global_window: int = 10 * 60
    # A procura dispara a cada letra; a ficha é uma por título aberto.
    stocks_search_per_ip: int = 240
    stocks_search_window: int = 10 * 60
    stocks_query: int = 40


LIMITS = Limits()
