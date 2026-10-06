from datetime import UTC, datetime

from sqlalchemy.orm import Session

from app.expeditions.schemas import ExpeditionFleetPayload
from app.expeditions.service import (
    get_current_expedition_state,
    start_expedition,
)
from app.galaxy.service import (
    get_galaxy_resource_mission_state,
    get_galaxy_scout_state,
    start_galaxy_resource_mission,
    start_galaxy_scout_mission,
)
from app.missions.schemas import (
    MissionItemResponse,
    MissionsStateResponse,
    StartMissionRequest,
)
from app.planets.repository import get_planet_by_user_id, get_user_by_telegram_id
from app.planets.service import get_or_create_home_planet
from app.transport.service import (
    get_current_transport_missions,
    start_transport_mission,
)


class MissionStartPayloadError(Exception):
    pass


class MissionStartNotImplementedError(Exception):
    pass


def _normalize_datetime(value: datetime | None) -> datetime | None:
    if value is None:
        return None
    if value.tzinfo is None:
        return value.replace(tzinfo=UTC)
    return value


def _datetime_sort_key(value: datetime | None) -> datetime:
    normalized = _normalize_datetime(value)
    if normalized is None:
        return datetime.min.replace(tzinfo=UTC)
    return normalized


def get_current_missions_state(
    db: Session,
    telegram_id: int,
) -> MissionsStateResponse:
    items: list[MissionItemResponse] = []

    user = get_user_by_telegram_id(db, telegram_id)
    if user is None:
        return MissionsStateResponse(items=[])

    planet = get_planet_by_user_id(db, user.id)
    if planet is None:
        return MissionsStateResponse(items=[])

    scout_state = get_galaxy_scout_state(db, telegram_id)
    if scout_state.active_mission is not None:
        items.append(
            MissionItemResponse(
                source="galaxy_scout",
                type="scout",
                status="active",
                title="Разведка системы",
                started_at=scout_state.active_mission.started_at,
                finishes_at=scout_state.active_mission.finishes_at,
                completed_at=None,
                details={
                    "target_galaxy": scout_state.active_mission.target_galaxy,
                    "target_system": scout_state.active_mission.target_system,
                    "remaining_seconds": scout_state.active_mission.remaining_seconds,
                },
            )
        )

    resource_state = get_galaxy_resource_mission_state(db, telegram_id)
    if resource_state.active_mission is not None:
        items.append(
            MissionItemResponse(
                source="galaxy_resource",
                type="harvest",
                status="active",
                title="Сбор ресурсов",
                started_at=resource_state.active_mission.started_at,
                finishes_at=resource_state.active_mission.finishes_at,
                completed_at=None,
                details={
                    "target_galaxy": resource_state.active_mission.target_galaxy,
                    "target_system": resource_state.active_mission.target_system,
                    "remaining_seconds": resource_state.active_mission.remaining_seconds,
                },
            )
        )

    home_planet = get_or_create_home_planet(db, telegram_id)
    expedition_state = get_current_expedition_state(db, home_planet.id)
    if expedition_state.active_expedition is not None:
        items.append(
            MissionItemResponse(
                source="expedition",
                type="expedition",
                status="active",
                title="Экспедиция",
                started_at=expedition_state.active_expedition.started_at,
                finishes_at=expedition_state.active_expedition.finishes_at,
                completed_at=None,
                details={
                    "remaining_seconds": expedition_state.active_expedition.remaining_seconds,
                    "sent_ships": dict(expedition_state.active_expedition.sent_ships or {}),
                },
            )
        )

    transport_missions = get_current_transport_missions(db, telegram_id)
    for mission in transport_missions:
        items.append(
            MissionItemResponse(
                source="transport",
                type="transport",
                status=mission.status,
                title="Транспортировка ресурсов",
                started_at=mission.started_at,
                finishes_at=mission.finishes_at,
                completed_at=mission.completed_at,
                details={
                    "target_galaxy": mission.target_galaxy,
                    "target_system": mission.target_system,
                    "metal": mission.metal,
                    "crystal": mission.crystal,
                    "transport_count": mission.transport_count,
                },
            )
        )

    items.sort(
        key=lambda item: _datetime_sort_key(item.started_at),
        reverse=True,
    )

    return MissionsStateResponse(items=items)


def start_mission(
    db: Session,
    payload: StartMissionRequest,
):
    user = get_user_by_telegram_id(db, payload.telegram_id)
    if user is None:
        raise MissionStartPayloadError

    planet = get_planet_by_user_id(db, user.id)
    if planet is None:
        raise MissionStartPayloadError

    if payload.type == "expedition":
        if payload.ships is None:
            raise MissionStartPayloadError

        fleet = ExpeditionFleetPayload(
            scout=payload.ships.scout,
            transport=payload.ships.transport,
            fighter=payload.ships.fighter,
        )

        start_expedition(
            db,
            planet_id=planet.id,
            fleet=fleet,
        )
        return None

    if payload.type == "scout":
        if payload.target_galaxy is None or payload.target_system is None:
            raise MissionStartPayloadError

        return start_galaxy_scout_mission(
            db,
            telegram_id=payload.telegram_id,
            target_galaxy=payload.target_galaxy,
            target_system=payload.target_system,
        )

    if payload.type == "harvest":
        if payload.target_galaxy is None or payload.target_system is None:
            raise MissionStartPayloadError

        return start_galaxy_resource_mission(
            db,
            telegram_id=payload.telegram_id,
            target_galaxy=payload.target_galaxy,
            target_system=payload.target_system,
        )

    if payload.type == "transport":
        if payload.target_galaxy is None or payload.target_system is None:
            raise MissionStartPayloadError

        return start_transport_mission(
            db,
            telegram_id=payload.telegram_id,
            target_galaxy=payload.target_galaxy,
            target_system=payload.target_system,
            metal=payload.metal or 0,
            crystal=payload.crystal or 0,
        )

    if payload.type == "attack":
        raise MissionStartNotImplementedError

    raise MissionStartNotImplementedError