from datetime import datetime, timedelta, timezone

import pytest

from app.buildings.repository import get_active_queue_item, get_by_planet_and_code
from app.buildings.service import (
    BuildingQueueBusyError,
    apply_completed_building_queue,
    ensure_buildings,
    start_building_upgrade,
)
from app.planets.service import get_or_create_home_planet
from app.resources.repository import get_by_planet_id as get_resource_by_planet_id
from app.resources.service import NotEnoughResourcesError, ensure_resource_state


def test_start_building_upgrade_creates_queue_and_spends_resources(db_session) -> None:
    planet = get_or_create_home_planet(db_session, telegram_id=1001)
    ensure_buildings(db_session, planet.id)
    resource_state = ensure_resource_state(db_session, planet.id)

    metal_before = resource_state.metal
    crystal_before = resource_state.crystal

    start_building_upgrade(
        db=db_session,
        planet_id=planet.id,
        building_code="metal_mine",
    )

    queue_item = get_active_queue_item(db_session, planet.id)
    assert queue_item is not None
    assert queue_item.building_code == "metal_mine"
    assert queue_item.target_level == 2
    assert queue_item.status == "active"

    updated_resources = get_resource_by_planet_id(db_session, planet.id)
    assert updated_resources is not None
    assert updated_resources.metal < metal_before
    assert updated_resources.crystal < crystal_before


def test_cannot_start_second_upgrade_while_queue_is_active(db_session) -> None:
    planet = get_or_create_home_planet(db_session, telegram_id=1002)
    ensure_buildings(db_session, planet.id)
    ensure_resource_state(db_session, planet.id)

    start_building_upgrade(
        db=db_session,
        planet_id=planet.id,
        building_code="metal_mine",
    )

    with pytest.raises(BuildingQueueBusyError):
        start_building_upgrade(
            db=db_session,
            planet_id=planet.id,
            building_code="crystal_mine",
        )


def test_apply_completed_building_queue_upgrades_building_once(db_session) -> None:
    planet = get_or_create_home_planet(db_session, telegram_id=1003)
    ensure_buildings(db_session, planet.id)
    ensure_resource_state(db_session, planet.id)

    start_building_upgrade(
        db=db_session,
        planet_id=planet.id,
        building_code="metal_mine",
    )

    queue_item = get_active_queue_item(db_session, planet.id)
    assert queue_item is not None

    queue_item.finishes_at = datetime.now(timezone.utc) - timedelta(seconds=1)
    db_session.commit()

    apply_completed_building_queue(db_session, planet.id)

    building = get_by_planet_and_code(
        db_session,
        planet.id,
        "metal_mine",
    )
    assert building is not None
    assert building.level == 2

    completed_queue = get_active_queue_item(db_session, planet.id)
    assert completed_queue is None

    apply_completed_building_queue(db_session, planet.id)

    building_after_second_apply = get_by_planet_and_code(
        db_session,
        planet.id,
        "metal_mine",
    )
    assert building_after_second_apply is not None
    assert building_after_second_apply.level == 2


def test_not_enough_resources_prevents_upgrade(db_session) -> None:
    planet = get_or_create_home_planet(db_session, telegram_id=1004)
    ensure_buildings(db_session, planet.id)
    resource_state = ensure_resource_state(db_session, planet.id)

    resource_state.metal = 0
    resource_state.crystal = 0
    db_session.commit()

    with pytest.raises(NotEnoughResourcesError):
        start_building_upgrade(
            db=db_session,
            planet_id=planet.id,
            building_code="metal_mine",
        )

    queue_item = get_active_queue_item(db_session, planet.id)
    assert queue_item is None