from datetime import datetime, timedelta, timezone

from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.galaxy.models import GalaxyScoutMission
from app.galaxy.repository import (
    add_scout_mission,
    get_active_scout_mission_by_planet_id,
    get_known_systems_by_planet_id,
    get_last_completed_scout_mission_by_planet_id,
    upsert_known_system,
)
from app.galaxy.rules import (
    MAX_SCOUT_DISTANCE,
    build_scout_report,
    scout_duration_seconds,
    sector_system_numbers,
    system_display_name,
)
from app.galaxy.schemas import (
    GalaxyPlanetMarker,
    GalaxyScoutMissionResponse,
    GalaxyScoutReportResponse,
    GalaxyScoutStateResponse,
    GalaxySectorResponse,
    GalaxySystemItem,
)
from app.planets.service import get_or_create_home_planet
from app.ships.repository import get_by_planet_and_code
from app.ships.service import ensure_ships


class GalaxyScoutMissionBusyError(Exception):
    pass


class GalaxyScoutTargetTooFarError(Exception):
    pass


class GalaxyScoutInvalidTargetError(Exception):
    pass


class NotEnoughScoutsError(Exception):
    pass


def get_galaxy_sector(
    db: Session,
    telegram_id: int,
    radius: int = 3,
) -> GalaxySectorResponse:
    home_planet = get_or_create_home_planet(
        db=db,
        telegram_id=telegram_id,
    )

    apply_completed_scout_mission(
        db=db,
        planet_id=home_planet.id,
    )

    known_systems = get_known_systems_by_planet_id(
        db=db,
        planet_id=home_planet.id,
    )
    known_systems_by_coordinates = {
        (known_system.target_galaxy, known_system.target_system): known_system
        for known_system in known_systems
    }

    systems: list[GalaxySystemItem] = []

    for system_number in sector_system_numbers(
        center_system=home_planet.system,
        radius=radius,
    ):
        is_home_system = system_number == home_planet.system

        known_system = known_systems_by_coordinates.get(
            (home_planet.galaxy, system_number)
        )
        scout_report = _known_system_to_report_response(known_system)

        richness = "Неизвестно"
        danger = "Неизвестно"
        danger_level = 0

        if is_home_system:
            richness = "Домашняя система"
            danger = "Безопасно"
            danger_level = 0
        elif scout_report is not None:
            richness = scout_report.richness
            danger = scout_report.danger
            danger_level = scout_report.danger_level

        planets: list[GalaxyPlanetMarker] = []

        if is_home_system:
            planets.append(
                GalaxyPlanetMarker(
                    name=home_planet.name,
                    position=home_planet.position,
                    owner_name=home_planet.username,
                    is_home_planet=True,
                )
            )

        systems.append(
            GalaxySystemItem(
                galaxy=home_planet.galaxy,
                system=system_number,
                name=system_display_name(
                    galaxy=home_planet.galaxy,
                    system=system_number,
                ),
                distance=abs(system_number - home_planet.system),
                richness=richness,
                danger=danger,
                danger_level=danger_level,
                has_home_planet=is_home_system,
                is_scouted=known_system is not None,
                scout_report=scout_report,
                planets=planets,
            )
        )

    return GalaxySectorResponse(
        current_galaxy=home_planet.galaxy,
        current_system=home_planet.system,
        current_position=home_planet.position,
        systems=systems,
    )


def get_galaxy_scout_state(
    db: Session,
    telegram_id: int,
) -> GalaxyScoutStateResponse:
    home_planet = get_or_create_home_planet(
        db=db,
        telegram_id=telegram_id,
    )

    apply_completed_scout_mission(
        db=db,
        planet_id=home_planet.id,
    )

    active_mission = get_active_scout_mission_by_planet_id(
        db=db,
        planet_id=home_planet.id,
    )
    last_completed = get_last_completed_scout_mission_by_planet_id(
        db=db,
        planet_id=home_planet.id,
    )

    last_report = None
    if (
        last_completed is not None
        and last_completed.result_payload is not None
        and last_completed.completed_at is not None
    ):
        last_report = GalaxyScoutReportResponse(
            **last_completed.result_payload,
            completed_at=last_completed.completed_at,
        )

    return GalaxyScoutStateResponse(
        active_mission=_to_scout_mission_response(active_mission),
        last_report=last_report,
    )


def start_galaxy_scout_mission(
    db: Session,
    telegram_id: int,
    target_galaxy: int,
    target_system: int,
) -> None:
    home_planet = get_or_create_home_planet(
        db=db,
        telegram_id=telegram_id,
    )

    apply_completed_scout_mission(
        db=db,
        planet_id=home_planet.id,
    )
    ensure_ships(
        db=db,
        planet_id=home_planet.id,
    )

    active_mission = get_active_scout_mission_by_planet_id(
        db=db,
        planet_id=home_planet.id,
    )
    if active_mission is not None:
        raise GalaxyScoutMissionBusyError

    if target_galaxy != home_planet.galaxy:
        raise GalaxyScoutInvalidTargetError

    if target_system == home_planet.system:
        raise GalaxyScoutInvalidTargetError

    distance = abs(target_system - home_planet.system)

    if distance > MAX_SCOUT_DISTANCE:
        raise GalaxyScoutTargetTooFarError

    scout_state = get_by_planet_and_code(
        db=db,
        planet_id=home_planet.id,
        ship_code="scout",
    )
    scout_quantity = scout_state.quantity if scout_state else 0

    if scout_quantity < 1:
        raise NotEnoughScoutsError

    if scout_state is None:
        raise NotEnoughScoutsError

    scout_state.quantity -= 1

    now = datetime.now(timezone.utc)
    duration = scout_duration_seconds(distance)

    try:
        add_scout_mission(
            db=db,
            mission=GalaxyScoutMission(
                planet_id=home_planet.id,
                status="active",
                target_galaxy=target_galaxy,
                target_system=target_system,
                started_at=now,
                finishes_at=now + timedelta(seconds=duration),
                completed_at=None,
                result_payload=None,
            ),
        )
        db.commit()
    except IntegrityError:
        db.rollback()
        raise GalaxyScoutMissionBusyError


def apply_completed_scout_mission(
    db: Session,
    planet_id: int,
) -> None:
    active_mission = get_active_scout_mission_by_planet_id(
        db=db,
        planet_id=planet_id,
    )

    if active_mission is None:
        return

    now = datetime.now(timezone.utc)
    finishes_at = _as_utc(active_mission.finishes_at)

    if finishes_at > now:
        return

    ensure_ships(
        db=db,
        planet_id=planet_id,
    )

    scout_state = get_by_planet_and_code(
        db=db,
        planet_id=planet_id,
        ship_code="scout",
    )

    if scout_state is not None:
        scout_state.quantity += 1

    report_payload = build_scout_report(
        target_galaxy=active_mission.target_galaxy,
        target_system=active_mission.target_system,
    )

    active_mission.status = "completed"
    active_mission.completed_at = now
    active_mission.result_payload = report_payload

    upsert_known_system(
        db=db,
        planet_id=planet_id,
        target_galaxy=active_mission.target_galaxy,
        target_system=active_mission.target_system,
        report_payload=report_payload,
        discovered_at=now,
    )

    db.commit()


def _to_scout_mission_response(
    mission: GalaxyScoutMission | None,
) -> GalaxyScoutMissionResponse | None:
    if mission is None:
        return None

    now = datetime.now(timezone.utc)
    finishes_at = _as_utc(mission.finishes_at)

    return GalaxyScoutMissionResponse(
        id=mission.id,
        target_galaxy=mission.target_galaxy,
        target_system=mission.target_system,
        started_at=mission.started_at,
        finishes_at=mission.finishes_at,
        remaining_seconds=max(
            0,
            int((finishes_at - now).total_seconds()),
        ),
    )


def _known_system_to_report_response(
    known_system,
) -> GalaxyScoutReportResponse | None:
    if known_system is None:
        return None

    return GalaxyScoutReportResponse(
        **known_system.report_payload,
        completed_at=known_system.updated_at,
    )


def _as_utc(value):
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)

    return value.astimezone(timezone.utc)