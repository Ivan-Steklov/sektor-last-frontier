from datetime import datetime, timedelta, timezone

from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.buildings.repository import get_by_planet_and_code as get_building_by_planet_and_code
from app.resources.service import (
    NotEnoughResourcesError,
    spend_resources,
    sync_resources,
)
from app.ships.catalog import SHIPS, SHIPS_BY_CODE
from app.ships.models import ShipQueueItem, ShipState
from app.ships.repository import (
    add_queue_item,
    add_ship_state,
    get_active_queue_item,
    get_by_planet_and_code,
    get_by_planet_id,
)
from app.ships.rules import (
    required_shipyard_level,
    ship_build_seconds,
    ship_cost,
    shipyard_requirement_met,
)
from app.ships.schemas import (
    ShipItemResponse,
    ShipListResponse,
    ShipQueueResponse,
)


class UnknownShipError(Exception):
    pass


class ShipQueueBusyError(Exception):
    pass


class ShipRequirementsNotMetError(Exception):
    pass


class InvalidShipQuantityError(Exception):
    pass


def ensure_ships(
    db: Session,
    planet_id: int,
) -> list[ShipState]:
    existing_ships = get_by_planet_id(db, planet_id)
    existing_codes = {
        ship.ship_code
        for ship in existing_ships
    }

    created_any = False

    for definition in SHIPS:
        if definition.code in existing_codes:
            continue

        add_ship_state(
            db,
            ShipState(
                planet_id=planet_id,
                ship_code=definition.code,
                quantity=0,
            ),
        )
        created_any = True

    if created_any:
        try:
            db.commit()
        except IntegrityError:
            db.rollback()

    return get_by_planet_id(db, planet_id)


def apply_completed_ship_queue(
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

    ship_state = get_by_planet_and_code(
        db,
        planet_id,
        queue_item.ship_code,
    )

    if ship_state is None:
        ensure_ships(db, planet_id)
        ship_state = get_by_planet_and_code(
            db,
            planet_id,
            queue_item.ship_code,
        )

    if ship_state is None:
        raise UnknownShipError

    sync_resources(
        db=db,
        planet_id=planet_id,
        calculated_at=finishes_at,
    )

    ship_state.quantity += queue_item.quantity
    queue_item.status = "completed"
    queue_item.completed_at = now

    db.commit()


def get_current_ships(
    db: Session,
    planet_id: int,
) -> ShipListResponse:
    apply_completed_ship_queue(db, planet_id)

    states = ensure_ships(db, planet_id)
    active_queue = get_active_queue_item(db, planet_id)

    states_by_code = {
        state.ship_code: state
        for state in states
    }

    shipyard = get_building_by_planet_and_code(
        db,
        planet_id,
        "shipyard",
    )
    shipyard_level = shipyard.level if shipyard else 1

    ships = []

    for definition in SHIPS:
        state = states_by_code[definition.code]

        metal_cost, crystal_cost = ship_cost(
            definition.code,
            1,
        )
        build_seconds = ship_build_seconds(
            definition.code,
            1,
        )
        required_level = required_shipyard_level(definition.code)
        requirements_met = shipyard_requirement_met(
            shipyard_level=shipyard_level,
            ship_code=definition.code,
        )

        is_in_queue = (
            active_queue is not None
            and active_queue.ship_code == definition.code
        )

        ships.append(
            ShipItemResponse(
                code=definition.code,
                name=definition.name,
                description=definition.description,
                quantity=state.quantity,
                build_metal_cost=metal_cost,
                build_crystal_cost=crystal_cost,
                build_seconds=build_seconds,
                required_shipyard_level=required_level,
                requirements_met=requirements_met,
                can_build=active_queue is None and requirements_met,
                is_in_queue=is_in_queue,
            )
        )

    return ShipListResponse(
        ships=ships,
        queue=_to_queue_response(active_queue),
    )


def start_ship_build(
    db: Session,
    planet_id: int,
    ship_code: str,
    quantity: int,
) -> None:
    if ship_code not in SHIPS_BY_CODE:
        raise UnknownShipError

    if quantity <= 0:
        raise InvalidShipQuantityError

    apply_completed_ship_queue(db, planet_id)
    ensure_ships(db, planet_id)

    active_queue = get_active_queue_item(db, planet_id)
    if active_queue is not None:
        raise ShipQueueBusyError

    ship_state = get_by_planet_and_code(
        db,
        planet_id,
        ship_code,
    )

    if ship_state is None:
        raise UnknownShipError

    shipyard = get_building_by_planet_and_code(
        db,
        planet_id,
        "shipyard",
    )
    shipyard_level = shipyard.level if shipyard else 1

    if not shipyard_requirement_met(
        shipyard_level=shipyard_level,
        ship_code=ship_code,
    ):
        raise ShipRequirementsNotMetError

    metal_cost, crystal_cost = ship_cost(
        ship_code,
        quantity,
    )
    build_seconds = ship_build_seconds(
        ship_code,
        quantity,
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
            ShipQueueItem(
                planet_id=planet_id,
                ship_code=ship_code,
                quantity=quantity,
                status="active",
                started_at=now,
                finishes_at=now + timedelta(seconds=build_seconds),
            ),
        )

        db.commit()

    except NotEnoughResourcesError:
        db.rollback()
        raise
    except IntegrityError:
        db.rollback()
        raise ShipQueueBusyError


def _to_queue_response(
    queue_item: ShipQueueItem | None,
) -> ShipQueueResponse | None:
    if queue_item is None:
        return None

    now = datetime.now(timezone.utc)
    finishes_at = _as_utc(queue_item.finishes_at)
    remaining_seconds = max(
        0,
        int((finishes_at - now).total_seconds()),
    )
    definition = SHIPS_BY_CODE[queue_item.ship_code]

    return ShipQueueResponse(
        id=queue_item.id,
        ship_code=queue_item.ship_code,
        ship_name=definition.name,
        quantity=queue_item.quantity,
        started_at=queue_item.started_at,
        finishes_at=queue_item.finishes_at,
        remaining_seconds=remaining_seconds,
    )


def _as_utc(value: datetime) -> datetime:
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)

    return value.astimezone(timezone.utc)