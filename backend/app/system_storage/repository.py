from sqlalchemy import select
from sqlalchemy.orm import Session

from app.system_storage.models import SystemStorage


def get_storage_by_coordinates(
    db: Session,
    planet_id: int,
    galaxy: int,
    system: int,
) -> SystemStorage | None:
    return db.scalar(
        select(SystemStorage).where(
            SystemStorage.planet_id == planet_id,
            SystemStorage.galaxy == galaxy,
            SystemStorage.system == system,
        )
    )


def get_storages_by_planet_id(
    db: Session,
    planet_id: int,
) -> list[SystemStorage]:
    return list(
        db.scalars(
            select(SystemStorage)
            .where(SystemStorage.planet_id == planet_id)
            .order_by(
                SystemStorage.galaxy.asc(),
                SystemStorage.system.asc(),
                SystemStorage.id.asc(),
            )
        )
    )


def add_storage(
    db: Session,
    storage: SystemStorage,
) -> SystemStorage:
    db.add(storage)
    db.flush()

    return storage