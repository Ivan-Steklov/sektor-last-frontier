"""create transport missions

Revision ID: 7d4d2d8b9c11
Revises: 1148ac771bd8
Create Date: 2026-10-04 00:00:00.000000

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "7d4d2d8b9c11"
down_revision: Union[str, Sequence[str], None] = "1148ac771bd8"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "transport_missions",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("planet_id", sa.Integer(), nullable=False),
        sa.Column("status", sa.String(length=32), nullable=False),
        sa.Column("target_galaxy", sa.Integer(), nullable=False),
        sa.Column("target_system", sa.Integer(), nullable=False),
        sa.Column("metal", sa.Integer(), server_default="0", nullable=False),
        sa.Column("crystal", sa.Integer(), server_default="0", nullable=False),
        sa.Column("transport_count", sa.Integer(), server_default="1", nullable=False),
        sa.Column("started_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("finishes_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["planet_id"], ["planets.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_transport_missions_planet_id",
        "transport_missions",
        ["planet_id"],
        unique=False,
    )
    op.create_index(
        "ix_transport_missions_status",
        "transport_missions",
        ["status"],
        unique=False,
    )
    op.create_index(
        "ix_transport_mission_one_active_per_planet",
        "transport_missions",
        ["planet_id"],
        unique=True,
        sqlite_where=sa.text("status = 'active'"),
        postgresql_where=sa.text("status = 'active'"),
    )


def downgrade() -> None:
    op.drop_index("ix_transport_mission_one_active_per_planet", table_name="transport_missions")
    op.drop_index("ix_transport_missions_status", table_name="transport_missions")
    op.drop_index("ix_transport_missions_planet_id", table_name="transport_missions")
    op.drop_table("transport_missions")