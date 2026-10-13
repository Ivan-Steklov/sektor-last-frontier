"""create system storages

Revision ID: 8b51f0d7a2c3
Revises: 7d4d2d8b9c11
Create Date: 2026-10-06 00:00:00.000000
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op


revision: str = "8b51f0d7a2c3"
down_revision: str | None = "7d4d2d8b9c11"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "system_storages",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("planet_id", sa.Integer(), nullable=False),
        sa.Column("galaxy", sa.Integer(), nullable=False),
        sa.Column("system", sa.Integer(), nullable=False),
        sa.Column(
            "metal",
            sa.Integer(),
            server_default="0",
            nullable=False,
        ),
        sa.Column(
            "crystal",
            sa.Integer(),
            server_default="0",
            nullable=False,
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(
            ["planet_id"],
            ["planets.id"],
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "planet_id",
            "galaxy",
            "system",
            name="uq_system_storage_planet_coordinates",
        ),
    )

    op.create_index(
        "ix_system_storages_planet_id",
        "system_storages",
        ["planet_id"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(
        "ix_system_storages_planet_id",
        table_name="system_storages",
    )
    op.drop_table("system_storages")