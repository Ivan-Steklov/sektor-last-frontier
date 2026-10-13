"""add heavy transport count to transport missions

Revision ID: b6d9f1a2c3e4
Revises: 8b51f0d7a2c3
Create Date: 2026-10-13
"""

from alembic import op
import sqlalchemy as sa


revision = "b6d9f1a2c3e4"
down_revision = "8b51f0d7a2c3"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "transport_missions",
        sa.Column(
            "heavy_transport_count",
            sa.Integer(),
            nullable=False,
            server_default="0",
        ),
    )


def downgrade() -> None:
    op.drop_column("transport_missions", "heavy_transport_count")