"""add unique active building queue per planet

Revision ID: 4b1e6f2c9a10
Revises: 9b6b7a94606a
Create Date: 2026-10-01 10:20:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "4b1e6f2c9a10"
down_revision: Union[str, Sequence[str], None] = "9b6b7a94606a"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_index(
        "ix_building_queue_one_active_per_planet",
        "building_queue_items",
        ["planet_id"],
        unique=True,
        postgresql_where=sa.text("status = 'active'"),
    )


def downgrade() -> None:
    op.drop_index(
        "ix_building_queue_one_active_per_planet",
        table_name="building_queue_items",
    )