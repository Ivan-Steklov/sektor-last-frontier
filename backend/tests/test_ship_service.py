from datetime import datetime, timedelta, timezone

import pytest

from app.buildings.repository import get_by_planet_and_code as get_building_by_planet_and_code
from app.buildings.service import ensure_buildings
from app.planets.service import get_or_create_home_planet
from app.resources.repository import get_by_planet_id as get_resource_by_planet_id
from app.resources.service import NotEnoughResourcesError, ensure_resource_state
from app.ships.repository import get_active_queue_item, get_by_planet_and_code
from app.ships.service import (
    InvalidShipQuantityError,
    ShipQueueBusyError,
    ShipRequirementsNotMetError,
    apply_completed_ship_queue,
    ensure_ships,
    start_ship_build,
)


def test_start_ship_build_creates_queue_and_spends_resources(db_session) -> None:
    planet = get_or_create_home_planet(db_session, telegram_id=3001)
    ensure_buildings(db_session, planet.id)
    ensure_ships(db_session, planet.id)
    resource_state = ensure_resource_state(db_session, planet.id)

    resource_state.metal = 5000
    resource_state.crystal = 5000
    db_session.commit()

    metal_before = resource_state.metal
    crystal_before = resource_state.crystal

    start_ship_build(
        db=db_session,
        planet_id=planet.id,
        ship_code="scout",
        quantity=2,
    )

    queue_item = get_active_queue_item(db_session, planet.id)
    assert queue_item is not None
    assert queue_item.ship_code == "scout"
    assert queue_item.quantity == 2
    assert queue_item.status == "active"

    updated_resources = get_resource_by_planet_id(db_session, planet.id)
    assert updated_resources is not None
    assert updated_resources.metal < metal_before
    assert updated_resources.crystal < crystal_before


def test_cannot_start_second_ship_build_while_queue_active(db_session) -> None:
    planet = get_or_create_home_planet(db_session, telegram_id=3002)
    ensure_buildings(db_session, planet.id)
    ensure_ships(db_session, planet.id)
    ensure_resource_state(db_session, planet.id)

    resource_state = get_resource_by_planet_id(db_session, planet.id)
    assert resource_state is not None
    resource_state.metal = 5000
    resource_state.crystal = 5000
    db_session.commit()

    start_ship_build(
        db=db_session,
        planet_id=planet.id,
        ship_code="scout",
        quantity=1,
    )

    with pytest.raises(ShipQueueBusyError):
        start_ship_build(
            db=db_session,
            planet_id=planet.id,
            ship_code="transport",
            quantity=1,
        )


def test_completed_ship_queue_adds_ships_once(db_session) -> None:
    planet = get_or_create_home_planet(db_session, telegram_id=3003)
    ensure_buildings(db_session, planet.id)
    ensure_ships(db_session, planet.id)
    ensure_resource_state(db_session, planet.id)

    resource_state = get_resource_by_planet_id(db_session, planet.id)
    assert resource_state is not None
    resource_state.metal = 5000
    resource_state.crystal = 5000
    db_session.commit()

    start_ship_build(
        db=db_session,
        planet_id=planet.id,
        ship_code="scout",
        quantity=3,
    )

    queue_item = get_active_queue_item(db_session, planet.id)
    assert queue_item is not None

    queue_item.finishes_at = datetime.now(timezone.utc) - timedelta(seconds=1)
    db_session.commit()

    apply_completed_ship_queue(db_session, planet.id)

    ship_state = get_by_planet_and_code(
        db_session,
        planet.id,
        "scout",
    )
    assert ship_state is not None
    assert ship_state.quantity == 3
    assert get_active_queue_item(db_session, planet.id) is None

    apply_completed_ship_queue(db_session, planet.id)

    ship_state_after_second_apply = get_by_planet_and_code(
        db_session,
        planet.id,
        "scout",
    )
    assert ship_state_after_second_apply is not None
    assert ship_state_after_second_apply.quantity == 3


def test_not_enough_resources_prevents_ship_build(db_session) -> None:
    planet = get_or_create_home_planet(db_session, telegram_id=3004)
    ensure_buildings(db_session, planet.id)
    ensure_ships(db_session, planet.id)
    resource_state = ensure_resource_state(db_session, planet.id)

    resource_state.metal = 0
    resource_state.crystal = 0
    db_session.commit()

    with pytest.raises(NotEnoughResourcesError):
        start_ship_build(
            db=db_session,
            planet_id=planet.id,
            ship_code="scout",
            quantity=1,
        )

    assert get_active_queue_item(db_session, planet.id) is None


def test_invalid_ship_quantity_is_rejected(db_session) -> None:
    planet = get_or_create_home_planet(db_session, telegram_id=3005)
    ensure_buildings(db_session, planet.id)
    ensure_ships(db_session, planet.id)
    ensure_resource_state(db_session, planet.id)

    with pytest.raises(InvalidShipQuantityError):
        start_ship_build(
            db=db_session,
            planet_id=planet.id,
            ship_code="scout",
            quantity=0,
        )


def test_fighter_requires_shipyard_level_2(db_session) -> None:
    planet = get_or_create_home_planet(db_session, telegram_id=3006)
    ensure_buildings(db_session, planet.id)
    ensure_ships(db_session, planet.id)
    ensure_resource_state(db_session, planet.id)

    resource_state = get_resource_by_planet_id(db_session, planet.id)
    assert resource_state is not None
    resource_state.metal = 5000
    resource_state.crystal = 5000
    db_session.commit()

    shipyard = get_building_by_planet_and_code(
        db_session,
        planet.id,
        "shipyard",
    )
    assert shipyard is not None
    shipyard.level = 1
    db_session.commit()

    with pytest.raises(ShipRequirementsNotMetError):
        start_ship_build(
            db=db_session,
            planet_id=planet.id,
            ship_code="fighter",
            quantity=1,
        )