# ─────────────────────────────────────────────────────────────────────
# Cada tabela tem o seu módulo aqui. Importa-los todos neste ficheiro é
# o que faz o Alembic (`--autogenerate`) e `Base.metadata.create_all`
# (só usado nos testes) verem o esquema inteiro.
# ─────────────────────────────────────────────────────────────────────
from app.models.escrito import Escrito
from app.models.user import User

__all__ = ["Escrito", "User"]
