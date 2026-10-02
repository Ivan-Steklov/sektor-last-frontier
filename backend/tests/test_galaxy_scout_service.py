from datetime import datetime, timedelta, timezone

import pytest

from app.galaxy.repository import (
    get_active_scout_mission_by_planet_id,
    get_known_system,
)
from app.galaxy.service import (
    GalaxyScoutInvalidTargetError,
    GalaxyScoutMissionBusyError,
    GalaxyScoutTargetTooFarError,
    NotEnoughScoutsError,
    apply_completed_scout_mission,
    get_galaxy_scout_state,
    get_galaxy_sector,
    start_galaxy_scout_mission,
)
from app.planets.service import get_or_create_home_planet
from app.ships.repository import get_by_planet_and_code
from app.ships.service import ensure_ships


def test_start_scout_mission_removes_one_scout(db_session) -> None:
    planet = get_or_create_home_planet(
        db=db_session,
        telegram_id=5001,
    )
    ensure_ships(
        db=db_session,
        planet_id=planet.id,
    )

    scout = get_by_planet_and_code(
        db=db_session,
        planet_id=planet.id,
        ship_code="scout",
    )
    assert scout is not None

    scout.quantity = 2
    db_session.commit()

    start_galaxy_scout_mission(
        db=db_session,
        telegram_id=5001,
        target_galaxy=planet.galaxy,
        target_system=planet.system + 1,
    )

    scout_after = get_by_planet_and_code(
        db=db_session,
        planet_id=planet.id,
        ship_code="scout",
    )
    assert scout_after is not None
    assert scout_after.quantity == 1


def test_cannot_start_second_scout_mission_while_active(db_session) -> None:
    planet = get_or_create_home_planet(
        db=db_session,
        telegram_id=5002,
    )
    ensure_ships(
        db=db_session,
        planet_id=planet.id,
    )

    scout = get_by_planet_and_code(
        db=db_session,
        planet_id=planet.id,
        ship_code="scout",
    )
    assert scout is not None

    scout.quantity = 3
    db_session.commit()

    start_galaxy_scout_mission(
        db=db_session,
        telegram_id=5002,
        target_galaxy=planet.galaxy,
        target_system=planet.system + 1,
    )

    with pytest.raises(GalaxyScoutMissionBusyError):
        start_galaxy_scout_mission(
            db=db_session,
            telegram_id=5002,
            target_galaxy=planet.galaxy,
            target_system=planet.system + 2,
        )


def test_scout_mission_requires_scout_ship(db_session) -> None:
    planet = get_or_create_home_planet(
        db=db_session,
        telegram_id=5003,
    )
    ensure_ships(
        db=db_session,
        planet_id=planet.id,
    )

    with pytest.raises(NotEnoughScoutsError):
        start_galaxy_scout_mission(
            db=db_session,
            telegram_id=5003,
            target_galaxy=planet.galaxy,
            target_system=planet.system + 1,
        )


def test_cannot_scout_home_system(db_session) -> None:
    planet = get_or_create_home_planet(
        db=db_session,
        telegram_id=5004,
    )
    ensure_ships(
        db=db_session,
        planet_id=planet.id,
    )

    scout = get_by_planet_and_code(
        db=db_session,
        planet_id=planet.id,
        ship_code="scout",
    )
    assert scout is not None

    scout.quantity = 1
    db_session.commit()

    with pytest.raises(GalaxyScoutInvalidTargetError):
        start_galaxy_scout_mission(
            db=db_session,
            telegram_id=5004,
            target_galaxy=planet.galaxy,
            target_system=planet.system,
        )


def test_cannot_scout_too_far_system(db_session) -> None:
    planet = get_or_create_home_planet(
        db=db_session,
        telegram_id=5005,
    )
    ensure_ships(
        db=db_session,
        planet_id=planet.id,
    )

    scout = get_by_planet_and_code(
        db=db_session,
        planet_id=planet.id,
        ship_code="scout",
    )
    assert scout is not None

    scout.quantity = 1
    db_session.commit()

    with pytest.raises(GalaxyScoutTargetTooFarError):
        start_galaxy_scout_mission(
            db=db_session,
            telegram_id=5005,
            target_galaxy=planet.galaxy,
            target_system=planet.system + 10,
        )


def test_completed_scout_mission_returns_scout_and_report(db_session) -> None:
    planet = get_or_create_home_planet(
        db=db_session,
        telegram_id=5006,
    )
    ensure_ships(
        db=db_session,
        planet_id=planet.id,
    )

    scout = get_by_planet_and_code(
        db=db_session,
        planet_id=planet.id,
        ship_code="scout",
    )
    assert scout is not None

    scout.quantity = 1
    db_session.commit()

    start_galaxy_scout_mission(
        db=db_session,
        telegram_id=5006,
        target_galaxy=planet.galaxy,
        target_system=planet.system + 1,
    )

    active = get_active_scout_mission_by_planet_id(
        db=db_session,
        planet_id=planet.id,
    )
    assert active is not None

    active.finishes_at = datetime.now(timezone.utc) - timedelta(seconds=1)
    db_session.commit()

    apply_completed_scout_mission(
        db=db_session,
        planet_id=planet.id,
    )

    state = get_galaxy_scout_state(
        db=db_session,
        telegram_id=5006,
    )

    assert state.active_mission is None
    assert state.last_report is not None
    assert state.last_report.target_system == planet.system + 1

    scout_after = get_by_planet_and_code(
        db=db_session,
        planet_id=planet.id,
        ship_code="scout",
    )
    assert scout_after is not None
    assert scout_after.quantity == 1


def test_completed_scout_mission_creates_known_system(db_session) -> None:
    planet = get_or_create_home_planet(
        db=db_session,
        telegram_id=5007,
    )
    ensure_ships(
        db=db_session,
        planet_id=planet.id,
    )

    scout = get_by_planet_and_code(
        db=db_session,
        planet_id=planet.id,
        ship_code="scout",
    )
    assert scout is not None

    scout.quantity = 1
    db_session.commit()

    target_system = planet.system + 1

    start_galaxy_scout_mission(
        db=db_session,
        telegram_id=5007,
        target_galaxy=planet.galaxy,
        target_system=target_system,
    )

    active = get_active_scout_mission_by_planet_id(
        db=db_session,
        planet_id=planet.id,
    )
    assert active is not None

    active.finishes_at = datetime.now(timezone.utc) - timedelta(seconds=1)
    db_session.commit()

    apply_completed_scout_mission(
        db=db_session,
        planet_id=planet.id,
    )

    known_system = get_known_system(
        db=db_session,
        planet_id=planet.id,
        target_galaxy=planet.galaxy,
        target_system=target_system,
    )

    assert known_system is not None
    assert known_system.report_payload["target_system"] == target_system
    assert known_system.report_payload["description"] != ""


def test_galaxy_sector_marks_scouted_system(db_session) -> None:
    planet = get_or_create_home_planet(
        db=db_session,
        telegram_id=5008,
    )
    ensure_ships(
        db=db_session,
        planet_id=planet.id,
    )

    scout = get_by_planet_and_code(
        db=db_session,
        planet_id=planet.id,
        ship_code="scout",
    )
    assert scout is not None

    scout.quantity = 1
    db_session.commit()

    target_system = planet.system + 1

    start_galaxy_scout_mission(
        db=db_session,
        telegram_id=5008,
        target_galaxy=planet.galaxy,
        target_system=target_system,
    )

    active = get_active_scout_mission_by_planet_id(
        db=db_session,
        planet_id=planet.id,
    )
    assert active is not None

    active.finishes_at = datetime.now(timezone.utc) - timedelta(seconds=1)
    db_session.commit()

    sector = get_galaxy_sector(
        db=db_session,
        telegram_id=5008,
    )

    target = next(
        system for system in sector.systems if system.system == target_system
    )

    assert target.is_scouted is True
    assert target.scout_report is not None
    assert target.scout_report.target_system == target_system