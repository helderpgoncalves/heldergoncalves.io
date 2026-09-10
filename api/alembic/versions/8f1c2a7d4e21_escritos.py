"""escritos

Revision ID: 8f1c2a7d4e21
Revises: c03d4c98d3ad
Create Date: 2026-09-10

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "8f1c2a7d4e21"
down_revision: Union[str, None] = "c03d4c98d3ad"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "escritos",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text("gen_random_uuid()"),
        ),
        sa.Column("slug", sa.String(length=80), nullable=False),
        sa.Column("lang", sa.String(length=2), nullable=False),
        sa.Column("titulo", sa.String(length=200), nullable=False, server_default=""),
        sa.Column("descricao", sa.String(length=500), nullable=False, server_default=""),
        sa.Column("tags", postgresql.ARRAY(sa.String(length=40)), nullable=False, server_default="{}"),
        sa.Column("chave", sa.String(length=80), nullable=True),
        sa.Column("corpo", sa.Text(), nullable=False, server_default=""),
        sa.Column("estado", sa.String(length=12), nullable=False, server_default="rascunho"),
        sa.Column("criado_em", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("atualizado_em", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("publicado_em", sa.DateTime(timezone=True), nullable=True),
        sa.Column("commit_sha", sa.String(length=64), nullable=True),
    )
    op.create_index("ix_escritos_atualizado_em", "escritos", ["atualizado_em"])


def downgrade() -> None:
    op.drop_index("ix_escritos_atualizado_em", table_name="escritos")
    op.drop_table("escritos")
