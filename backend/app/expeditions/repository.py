from sqlalchemy import select
from sqlalchemy.orm import Session

from app.expeditions.models import ExpeditionItem


def get_active_by_planet_id(
    db: Session,
    planet_id: int,
) -> ExpeditionItem | None:
    return db.scalar(
        select(ExpeditionItem).where(
            ExpeditionItem.planet_id == planet_id,
            ExpeditionItem.status == "active",
        )
    )


def get_last_completed_by_planet_id(
    db: Session,
    planet_id: int,
) -> ExpeditionItem | None:
    return db.scalar(
        select(ExpeditionItem)
        .where(
            ExpeditionItem.planet_id == planet_id,
            ExpeditionItem.status == "completed",
        )
        .order_by(ExpeditionItem.completed_at.desc())
    )


def add_expedition(
    db: Session,
    item: ExpeditionItem,
) -> ExpeditionItem:
    db.add(item)
    db.flush()

    return item