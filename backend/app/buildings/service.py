from datetime import datetime, timedelta, timezone

from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.buildings.catalog import BUILDINGS, BUILDINGS_BY_CODE
from app.buildings.models import BuildingQueueItem, BuildingState
from app.buildings.repository import (
    add_building,
    add_queue_item,
    get_active_queue_item,
    get_by_planet_and_code,
    get_by_planet_id,
)
from app.buildings.rules import (
    building_upgrade_cost,
    building_upgrade_seconds,
)
from app.buildings.schemas import (
    BuildingQueueResponse,
    BuildingResponse,
    BuildingsResponse,
)
from app.resources.service import (
    NotEnoughResourcesError,
    spend_resources,
    sync_resources,
)


class UnknownBuildingError(Exception):
    pass


class BuildingQueueBusyError(Exception):
    pass


def ensure_buildings(
    db: Session,
    planet_id: int,
) -> list[BuildingState]:
    existing_buildings = get_by_planet_id(db, planet_id)
    existing_codes = {
        building.building_code
        for building in existing_buildings
    }

    created_any = False

    for definition in BUILDINGS:
        if definition.code in existing_codes:
            continue

        add_building(
            db,
            BuildingState(
                planet_id=planet_id,
                building_code=definition.code,
                level=1,
            ),
        )
        created_any = True

    if created_any:
        try:
            db.commit()
        except IntegrityError:
            db.rollback()

    return get_by_planet_id(db, planet_id)


def apply_completed_building_queue(
    db: Session,
    planet_id: int,
) -> None:
    queue_item = get_active_queue_item(db, planet_id)

    if queue_item is None:
        return

    now = datetime.now(timezone.utc)
    finishes_at = _as_utc(queue_item.finishes_at)

    if finishes_at > now:
        return

    building = get_by_planet_and_code(
        db,
        planet_id,
        queue_item.building_code,
    )

    if building is None:
        ensure_buildings(db, planet_id)
        building = get_by_planet_and_code(
            db,
            planet_id,
            queue_item.building_code,
        )

    if building is None:
        raise UnknownBuildingError

    sync_resources(
        db=db,
        planet_id=planet_id,
        calculated_at=finishes_at,
    )

    building.level = queue_item.target_level
    queue_item.status = "completed"
    queue_item.completed_at = now

    db.commit()


def get_current_buildings(
    db: Session,
    planet_id: int,
) -> BuildingsResponse:
    apply_completed_building_queue(db, planet_id)

    states = ensure_buildings(db, planet_id)
    active_queue = get_active_queue_item(db, planet_id)

    states_by_code = {
        state.building_code: state
        for state in states
    }

    buildings = []

    for definition in BUILDINGS:
        state = states_by_code[definition.code]

        metal_cost, crystal_cost = building_upgrade_cost(
            definition.code,
            state.level,
        )
        upgrade_seconds = building_upgrade_seconds(
            definition.code,
            state.level,
        )

        is_in_queue = (
            active_queue is not None
            and active_queue.building_code == definition.code
        )

        buildings.append(
            BuildingResponse(
                code=definition.code,
                name=definition.name,
                description=definition.description,
                level=state.level,
                next_level=state.level + 1,
                upgrade_metal_cost=metal_cost,
                upgrade_crystal_cost=crystal_cost,
                upgrade_seconds=upgrade_seconds,
                can_upgrade=active_queue is None,
                is_in_queue=is_in_queue,
            )
        )

    return BuildingsResponse(
        buildings=buildings,
        queue=_to_queue_response(active_queue),
    )


def start_building_upgrade(
    db: Session,
    planet_id: int,
    building_code: str,
) -> None:
    if building_code not in BUILDINGS_BY_CODE:
        raise UnknownBuildingError

    apply_completed_building_queue(db, planet_id)
    ensure_buildings(db, planet_id)

    active_queue = get_active_queue_item(db, planet_id)
    if active_queue is not None:
        raise BuildingQueueBusyError

    building = get_by_planet_and_code(
        db,
        planet_id,
        building_code,
    )

    if building is None:
        raise UnknownBuildingError

    metal_cost, crystal_cost = building_upgrade_cost(
        building_code,
        building.level,
    )
    upgrade_seconds = building_upgrade_seconds(
        building_code,
        building.level,
    )

    try:
        spend_resources(
            db=db,
            planet_id=planet_id,
            metal_cost=metal_cost,
            crystal_cost=crystal_cost,
        )

        now = datetime.now(timezone.utc)

        add_queue_item(
            db,
            BuildingQueueItem(
                planet_id=planet_id,
                building_code=building_code,
                target_level=building.level + 1,
                status="active",
                started_at=now,
                finishes_at=now + timedelta(seconds=upgrade_seconds),
            ),
        )

        db.commit()

    except NotEnoughResourcesError:
        db.rollback()
        raise
    except IntegrityError:
        db.rollback()
        raise BuildingQueueBusyError


def _to_queue_response(
    queue_item: BuildingQueueItem | None,
) -> BuildingQueueResponse | None:
    if queue_item is None:
        return None

    now = datetime.now(timezone.utc)
    finishes_at = _as_utc(queue_item.finishes_at)

    remaining_seconds = max(
        0,
        int((finishes_at - now).total_seconds()),
    )

    definition = BUILDINGS_BY_CODE[queue_item.building_code]

    return BuildingQueueResponse(
        id=queue_item.id,
        building_code=queue_item.building_code,
        building_name=definition.name,
        target_level=queue_item.target_level,
        started_at=queue_item.started_at,
        finishes_at=queue_item.finishes_at,
        remaining_seconds=remaining_seconds,
    )


def _as_utc(value: datetime) -> datetime:
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)

    return value.astimezone(timezone.utc)