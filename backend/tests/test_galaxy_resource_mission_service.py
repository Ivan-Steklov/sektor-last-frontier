from datetime import datetime, timedelta, timezone

import pytest

from app.galaxy.repository import (
    get_active_resource_mission_by_planet_id,
    get_active_scout_mission_by_planet_id,
)
from app.galaxy.service import (
    GalaxyResourceMissionBusyError,
    GalaxyResourceMissionInvalidTargetError,
    GalaxyResourceMissionTargetNotScoutedError,
    NotEnoughTransportsError,
    apply_completed_resource_mission,
    apply_completed_scout_mission,
    get_galaxy_resource_mission_state,
    start_galaxy_resource_mission,
    start_galaxy_scout_mission,
)
from app.planets.service import get_or_create_home_planet
from app.resources.service import get_current_resources
from app.ships.repository import get_by_planet_and_code
from app.ships.service import ensure_ships


def _scout_system(
    db_session,
    telegram_id: int,
    target_system: int,
) -> None:
    planet = get_or_create_home_planet(
        db=db_session,
        telegram_id=telegram_id,
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
        telegram_id=telegram_id,
        target_galaxy=planet.galaxy,
        target_system=target_system,
    )

    active_scout = get_active_scout_mission_by_planet_id(
        db=db_session,
        planet_id=planet.id,
    )
    assert active_scout is not None

    active_scout.finishes_at = datetime.now(timezone.utc) - timedelta(seconds=1)
    db_session.commit()

    apply_completed_scout_mission(
        db=db_session,
        planet_id=planet.id,
    )


def test_resource_mission_requires_scouted_system(db_session) -> None:
    planet = get_or_create_home_planet(
        db=db_session,
        telegram_id=6001,
    )
    ensure_ships(
        db=db_session,
        planet_id=planet.id,
    )

    transport = get_by_planet_and_code(
        db=db_session,
        planet_id=planet.id,
        ship_code="transport",
    )
    assert transport is not None
    transport.quantity = 1
    db_session.commit()

    with pytest.raises(GalaxyResourceMissionTargetNotScoutedError):
        start_galaxy_resource_mission(
            db=db_session,
            telegram_id=6001,
            target_galaxy=planet.galaxy,
            target_system=planet.system + 1,
        )


def test_resource_mission_requires_transport(db_session) -> None:
    planet = get_or_create_home_planet(
        db=db_session,
        telegram_id=6002,
    )

    target_system = planet.system + 1

    _scout_system(
        db_session=db_session,
        telegram_id=6002,
        target_system=target_system,
    )

    with pytest.raises(NotEnoughTransportsError):
        start_galaxy_resource_mission(
            db=db_session,
            telegram_id=6002,
            target_galaxy=planet.galaxy,
            target_system=target_system,
        )


def test_cannot_start_resource_mission_to_home_system(db_session) -> None:
    planet = get_or_create_home_planet(
        db=db_session,
        telegram_id=6003,
    )
    ensure_ships(
        db=db_session,
        planet_id=planet.id,
    )

    transport = get_by_planet_and_code(
        db=db_session,
        planet_id=planet.id,
        ship_code="transport",
    )
    assert transport is not None
    transport.quantity = 1
    db_session.commit()

    with pytest.raises(GalaxyResourceMissionInvalidTargetError):
        start_galaxy_resource_mission(
            db=db_session,
            telegram_id=6003,
            target_galaxy=planet.galaxy,
            target_system=planet.system,
        )


def test_start_resource_mission_removes_one_transport(db_session) -> None:
    planet = get_or_create_home_planet(
        db=db_session,
        telegram_id=6004,
    )

    target_system = planet.system + 1

    _scout_system(
        db_session=db_session,
        telegram_id=6004,
        target_system=target_system,
    )

    transport = get_by_planet_and_code(
        db=db_session,
        planet_id=planet.id,
        ship_code="transport",
    )
    assert transport is not None
    transport.quantity = 2
    db_session.commit()

    start_galaxy_resource_mission(
        db=db_session,
        telegram_id=6004,
        target_galaxy=planet.galaxy,
        target_system=target_system,
    )

    transport_after = get_by_planet_and_code(
        db=db_session,
        planet_id=planet.id,
        ship_code="transport",
    )
    assert transport_after is not None
    assert transport_after.quantity == 1


def test_cannot_start_second_resource_mission_while_active(db_session) -> None:
    planet = get_or_create_home_planet(
        db=db_session,
        telegram_id=6005,
    )

    target_system = planet.system + 1

    _scout_system(
        db_session=db_session,
        telegram_id=6005,
        target_system=target_system,
    )

    transport = get_by_planet_and_code(
        db=db_session,
        planet_id=planet.id,
        ship_code="transport",
    )
    assert transport is not None
    transport.quantity = 2
    db_session.commit()

    start_galaxy_resource_mission(
        db=db_session,
        telegram_id=6005,
        target_galaxy=planet.galaxy,
        target_system=target_system,
    )

    with pytest.raises(GalaxyResourceMissionBusyError):
        start_galaxy_resource_mission(
            db=db_session,
            telegram_id=6005,
            target_galaxy=planet.galaxy,
            target_system=target_system,
        )


def test_completed_resource_mission_returns_transport_and_resources(db_session) -> None:
    planet = get_or_create_home_planet(
        db=db_session,
        telegram_id=6006,
    )

    target_system = planet.system + 1

    _scout_system(
        db_session=db_session,
        telegram_id=6006,
        target_system=target_system,
    )

    transport = get_by_planet_and_code(
        db=db_session,
        planet_id=planet.id,
        ship_code="transport",
    )
    assert transport is not None
    transport.quantity = 1
    db_session.commit()

    resources_before = get_current_resources(
        db=db_session,
        planet_id=planet.id,
    )

    start_galaxy_resource_mission(
        db=db_session,
        telegram_id=6006,
        target_galaxy=planet.galaxy,
        target_system=target_system,
    )

    active_mission = get_active_resource_mission_by_planet_id(
        db=db_session,
        planet_id=planet.id,
    )
    assert active_mission is not None

    active_mission.finishes_at = datetime.now(timezone.utc) - timedelta(seconds=1)
    db_session.commit()

    apply_completed_resource_mission(
        db=db_session,
        planet_id=planet.id,
    )

    state = get_galaxy_resource_mission_state(
        db=db_session,
        telegram_id=6006,
    )

    assert state.active_mission is None
    assert state.last_result is not None
    assert state.last_result.metal_found > 0
    assert state.last_result.crystal_found > 0

    transport_after = get_by_planet_and_code(
        db=db_session,
        planet_id=planet.id,
        ship_code="transport",
    )
    assert transport_after is not None
    assert transport_after.quantity == 1

    resources_after = get_current_resources(
        db=db_session,
        planet_id=planet.id,
    )

    assert resources_after.metal >= resources_before.metal
    assert resources_after.crystal >= resources_before.crystal