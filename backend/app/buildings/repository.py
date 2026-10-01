from sqlalchemy import select
from sqlalchemy.orm import Session

from app.buildings.models import BuildingQueueItem, BuildingState


def get_by_planet_id(
    db: Session,
    planet_id: int,
) -> list[BuildingState]:
    return list(
        db.scalars(
            select(BuildingState)
            .where(BuildingState.planet_id == planet_id)
            .order_by(BuildingState.id)
        )
    )


def get_by_planet_and_code(
    db: Session,
    planet_id: int,
    building_code: str,
) -> BuildingState | None:
    return db.scalar(
        select(BuildingState).where(
            BuildingState.planet_id == planet_id,
            BuildingState.building_code == building_code,
        )
    )


def add_building(
    db: Session,
    building: BuildingState,
) -> BuildingState:
    db.add(building)
    db.flush()

    return building


def get_active_queue_item(
    db: Session,
    planet_id: int,
) -> BuildingQueueItem | None:
    return db.scalar(
        select(BuildingQueueItem).where(
            BuildingQueueItem.planet_id == planet_id,
            BuildingQueueItem.status == "active",
        )
    )


def add_queue_item(
    db: Session,
    queue_item: BuildingQueueItem,
) -> BuildingQueueItem:
    db.add(queue_item)
    db.flush()

    return queue_item