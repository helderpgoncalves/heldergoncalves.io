# ─────────────────────────────────────────────────────────────────────
# users — quem já entrou no site.
#
# Substitui `pessoas.ndjson`: a mesma ideia (um registo por email, que
# cresce em `visitas` e `ultima_visita` a cada sessão nova), agora numa
# tabela. "Dono" continua a não ser uma coluna aqui — é `OWNER_EMAIL`
# comparado ao email, em `sessions.py`. Ver docs/arquitetura.md.
# ─────────────────────────────────────────────────────────────────────
import uuid
from datetime import datetime

from sqlalchemy import DateTime, Integer, String, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db import Base


class User(Base):
    __tablename__ = "users"

    # A conta é o email — entrar por código ou pela Google é só o
    # caminho de uma sessão, nunca uma segunda conta. O mesmo email
    # entra hoje por código e amanhã pela Google sem duplicar a linha.
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email: Mapped[str] = mapped_column(String(160), unique=True, nullable=False, index=True)
    criado_em: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    ultima_visita: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    visitas: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    # A foto de perfil da Google, quando a sessão veio de lá — null para
    # quem só entrou por código. Nunca inventada (sem iniciais geradas,
    # sem Gravatar): o que não vem da Google fica sem avatar.
    #
    # `str` sem `Optional[...]`, de propósito: o SQLAlchemy 2.0 em
    # Python 3.14 não resolve bem `Mapped[Optional[str]]` (a anotação
    # chega como string, e o tipo union não se reconstrói) — `nullable`
    # vem de `mapped_column`, não da anotação.
    avatar_url: Mapped[str] = mapped_column(String(500), nullable=True)
