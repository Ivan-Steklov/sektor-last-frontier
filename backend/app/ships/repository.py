from sqlalchemy import select
from sqlalchemy.orm import Session

from app.ships.models import ShipQueueItem, ShipState


def get_by_planet_id(
    db: Session,
    planet_id: int,
) -> list[ShipState]:
    return list(
        db.scalars(
            select(ShipState)
            .where(ShipState.planet_id == planet_id)
            .order_by(ShipState.id)
        )
    )


def get_by_planet_and_code(
    db: Session,
    planet_id: int,
    ship_code: str,
) -> ShipState | None:
    return db.scalar(
        select(ShipState).where(
            ShipState.planet_id == planet_id,
            ShipState.ship_code == ship_code,
        )
    )


def add_ship_state(
    db: Session,
    ship_state: ShipState,
) -> ShipState:
    db.add(ship_state)
    db.flush()

    return ship_state


def get_active_queue_item(
    db: Session,
    planet_id: int,
) -> ShipQueueItem | None:
    return db.scalar(
        select(ShipQueueItem).where(
            ShipQueueItem.planet_id == planet_id,
            ShipQueueItem.status == "active",
        )
    )


def add_queue_item(
    db: Session,
    queue_item: ShipQueueItem,
) -> ShipQueueItem:
    db.add(queue_item)
    db.flush()

    return queue_item