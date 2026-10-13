from datetime import UTC, datetime

from sqlalchemy.orm import Session

from app.planets.repository import get_planet_by_user_id, get_user_by_telegram_id
from app.system_storage.models import SystemStorage
from app.system_storage.repository import (
    add_storage,
    get_storage_by_coordinates,
    get_storages_by_planet_id,
)
from app.system_storage.schemas import (
    SystemStorageItemResponse,
    SystemStorageStateResponse,
)


def add_resources_to_system_storage(
    db: Session,
    planet_id: int,
    galaxy: int,
    system: int,
    metal: int,
    crystal: int,
) -> SystemStorage:
    storage = get_storage_by_coordinates(
        db=db,
        planet_id=planet_id,
        galaxy=galaxy,
        system=system,
    )

    if storage is None:
        storage = add_storage(
            db,
            SystemStorage(
                planet_id=planet_id,
                galaxy=galaxy,
                system=system,
                metal=0,
                crystal=0,
            ),
        )

    storage.metal += metal
    storage.crystal += crystal
    storage.updated_at = datetime.now(UTC)

    return storage


def get_system_storage_state(
    db: Session,
    telegram_id: int,
) -> SystemStorageStateResponse:
    user = get_user_by_telegram_id(db, telegram_id)
    if user is None:
        return SystemStorageStateResponse(storages=[])

    planet = get_planet_by_user_id(db, user.id)
    if planet is None:
        return SystemStorageStateResponse(storages=[])

    storages = get_storages_by_planet_id(
        db=db,
        planet_id=planet.id,
    )

    return SystemStorageStateResponse(
        storages=[
            _to_response(storage)
            for storage in storages
        ],
    )


def _to_response(
    storage: SystemStorage,
) -> SystemStorageItemResponse:
    return SystemStorageItemResponse(
        id=storage.id,
        galaxy=storage.galaxy,
        system=storage.system,
        metal=storage.metal,
        crystal=storage.crystal,
        created_at=storage.created_at,
        updated_at=storage.updated_at,
    )