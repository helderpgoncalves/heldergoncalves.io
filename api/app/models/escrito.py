# ─────────────────────────────────────────────────────────────────────
# escritos — o que o dono escreve a partir do próprio site.
#
# Um escrito nasce aqui como rascunho, e publicar é outra coisa: o texto
# vai para o repositório como um ficheiro Markdown em
# src/content/blog/<lang>/<slug>.md (ver github.py), e é o build do
# Astro que o transforma na página pública. Esta tabela nunca é servida
# a visitantes — é o caderno do dono, não o blog.
#
# Um escrito publicado fica aqui com `estado = 'publicado'` e o commit
# que o levou; voltar a mexer-lhe fá-lo rascunho outra vez, e publicar
# de novo substitui o ficheiro.
# ─────────────────────────────────────────────────────────────────────
import uuid
from datetime import datetime

from sqlalchemy import DateTime, String, Text, func
from sqlalchemy.dialects.postgresql import ARRAY, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db import Base

RASCUNHO = "rascunho"
PUBLICADO = "publicado"


class Escrito(Base):
    __tablename__ = "escritos"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    # O endereço público, sem a língua — `porque-voltei-a-escrever`. É o
    # nome do ficheiro no repositório; a língua decide a pasta.
    slug: Mapped[str] = mapped_column(String(80), nullable=False)
    lang: Mapped[str] = mapped_column(String(2), nullable=False)
    titulo: Mapped[str] = mapped_column(String(200), nullable=False, default="")
    descricao: Mapped[str] = mapped_column(String(500), nullable=False, default="")
    tags: Mapped[list[str]] = mapped_column(ARRAY(String(40)), nullable=False, default=list)
    # A chave que liga a versão portuguesa à inglesa (o `key` do
    # frontmatter). Sem `Optional[...]` na anotação — ver models/user.py.
    chave: Mapped[str] = mapped_column(String(80), nullable=True)
    corpo: Mapped[str] = mapped_column(Text, nullable=False, default="")
    estado: Mapped[str] = mapped_column(String(12), nullable=False, default=RASCUNHO)
    criado_em: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    atualizado_em: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    publicado_em: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=True)
    commit_sha: Mapped[str] = mapped_column(String(64), nullable=True)
