from datetime import UTC, datetime, timedelta

from sqlalchemy.orm import Session

from app.galaxy.repository import get_known_system
from app.planets.repository import get_planet_by_user_id, get_user_by_telegram_id
from app.resources.repository import get_by_planet_id as get_resource_state_by_planet_id
from app.ships.catalog import SHIPS_BY_CODE
from app.ships.repository import get_by_planet_and_code
from app.ships.service import ensure_ships
from app.system_storage.service import add_resources_to_system_storage
from app.transport.models import TransportMission
from app.transport.repository import (
    add_mission,
    get_active_mission_by_planet_id,
    get_active_missions_by_planet_id,
    get_completed_missions_by_planet_id,
)

TRANSPORT_SHIP_CODE = "transport"
HEAVY_TRANSPORT_SHIP_CODE = "heavy_transport"
TRANSPORT_MISSION_DURATION_MINUTES = 10


def get_transport_cargo_capacity(
    transport_count: int = 1,
    heavy_transport_count: int = 0,
) -> int:
    return (
        transport_count * SHIPS_BY_CODE[TRANSPORT_SHIP_CODE].cargo_capacity
        + heavy_transport_count * SHIPS_BY_CODE[HEAVY_TRANSPORT_SHIP_CODE].cargo_capacity
    )


class TransportMissionBusyError(Exception):
    pass


class TransportMissionInvalidTargetError(Exception):
    pass


class TransportMissionTargetNotScoutedError(Exception):
    pass


class NotEnoughTransportShipsError(Exception):
    pass


class NotEnoughResourcesForTransportError(Exception):
    pass


class InvalidTransportPayloadError(Exception):
    pass


class TransportCargoCapacityExceededError(InvalidTransportPayloadError):
    pass


def start_transport_mission(
    db: Session,
    telegram_id: int,
    target_galaxy: int,
    target_system: int,
    metal: int,
    crystal: int,
    transport_count: int = 1,
    heavy_transport_count: int = 0,
) -> TransportMission:
    if target_galaxy < 1 or target_system < 1:
        raise TransportMissionInvalidTargetError

    if metal < 0 or crystal < 0:
        raise InvalidTransportPayloadError

    if metal == 0 and crystal == 0:
        raise InvalidTransportPayloadError

    if transport_count < 0 or heavy_transport_count < 0:
        raise InvalidTransportPayloadError

    if transport_count == 0 and heavy_transport_count == 0:
        raise NotEnoughTransportShipsError

    cargo_amount = metal + crystal
    cargo_capacity = get_transport_cargo_capacity(
        transport_count=transport_count,
        heavy_transport_count=heavy_transport_count,
    )

    if cargo_amount > cargo_capacity:
        raise TransportCargoCapacityExceededError

    user = get_user_by_telegram_id(db, telegram_id)
    if user is None:
        raise TransportMissionInvalidTargetError

    planet = get_planet_by_user_id(db, user.id)
    if planet is None:
        raise TransportMissionInvalidTargetError

    apply_completed_transport_mission(
        db=db,
        planet_id=planet.id,
    )

    active_mission = get_active_mission_by_planet_id(db, planet.id)
    if active_mission is not None:
        raise TransportMissionBusyError

    known_system = get_known_system(
        db,
        planet.id,
        target_galaxy,
        target_system,
    )
    if known_system is None:
        raise TransportMissionTargetNotScoutedError

    ensure_ships(
        db=db,
        planet_id=planet.id,
    )

    transport_state = get_by_planet_and_code(
        db,
        planet.id,
        TRANSPORT_SHIP_CODE,
    )
    heavy_transport_state = get_by_planet_and_code(
        db,
        planet.id,
        HEAVY_TRANSPORT_SHIP_CODE,
    )

    available_transports = transport_state.quantity if transport_state is not None else 0
    available_heavy_transports = (
        heavy_transport_state.quantity if heavy_transport_state is not None else 0
    )

    if available_transports < transport_count:
        raise NotEnoughTransportShipsError

    if available_heavy_transports < heavy_transport_count:
        raise NotEnoughTransportShipsError

    resource_state = get_resource_state_by_planet_id(db, planet.id)
    if resource_state is None:
        raise NotEnoughResourcesForTransportError

    if resource_state.metal < metal or resource_state.crystal < crystal:
        raise NotEnoughResourcesForTransportError

    now = datetime.now(UTC)
    finishes_at = now + timedelta(minutes=TRANSPORT_MISSION_DURATION_MINUTES)

    resource_state.metal -= metal
    resource_state.crystal -= crystal

    if transport_state is not None:
        transport_state.quantity -= transport_count

    if heavy_transport_state is not None:
        heavy_transport_state.quantity -= heavy_transport_count

    mission = TransportMission(
        planet_id=planet.id,
        status="active",
        target_galaxy=target_galaxy,
        target_system=target_system,
        metal=metal,
        crystal=crystal,
        transport_count=transport_count,
        heavy_transport_count=heavy_transport_count,
        started_at=now,
        finishes_at=finishes_at,
        completed_at=None,
    )
    add_mission(db, mission)
    db.commit()
    db.refresh(mission)

    return mission


def get_current_transport_missions(
    db: Session,
    telegram_id: int,
) -> list[TransportMission]:
    user = get_user_by_telegram_id(db, telegram_id)
    if user is None:
        return []

    planet = get_planet_by_user_id(db, user.id)
    if planet is None:
        return []

    apply_completed_transport_mission(
        db=db,
        planet_id=planet.id,
    )

    return get_active_missions_by_planet_id(db, planet.id)


def get_completed_transport_missions(
    db: Session,
    telegram_id: int,
    limit: int = 5,
) -> list[TransportMission]:
    user = get_user_by_telegram_id(db, telegram_id)
    if user is None:
        return []

    planet = get_planet_by_user_id(db, user.id)
    if planet is None:
        return []

    apply_completed_transport_mission(
        db=db,
        planet_id=planet.id,
    )

    return get_completed_missions_by_planet_id(
        db=db,
        planet_id=planet.id,
        limit=limit,
    )


def apply_completed_transport_mission(
    db: Session,
    planet_id: int,
) -> None:
    active_mission = get_active_mission_by_planet_id(db, planet_id)
    if active_mission is None:
        return

    now = datetime.now(UTC)
    finishes_at = _as_utc(active_mission.finishes_at)

    if finishes_at > now:
        return

    ensure_ships(
        db=db,
        planet_id=planet_id,
    )

    transport_state = get_by_planet_and_code(
        db,
        planet_id,
        TRANSPORT_SHIP_CODE,
    )
    heavy_transport_state = get_by_planet_and_code(
        db,
        planet_id,
        HEAVY_TRANSPORT_SHIP_CODE,
    )

    if transport_state is not None:
        transport_state.quantity += active_mission.transport_count

    if heavy_transport_state is not None:
        heavy_transport_state.quantity += active_mission.heavy_transport_count

    add_resources_to_system_storage(
        db=db,
        planet_id=planet_id,
        galaxy=active_mission.target_galaxy,
        system=active_mission.target_system,
        metal=active_mission.metal,
        crystal=active_mission.crystal,
    )

    active_mission.status = "completed"
    active_mission.completed_at = now

    db.commit()


def _as_utc(value: datetime) -> datetime:
    if value.tzinfo is None:
        return value.replace(tzinfo=UTC)

    return value.astimezone(UTC)