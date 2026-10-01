from datetime import datetime, timedelta, timezone

import pytest

from app.buildings.service import ensure_buildings
from app.planets.service import get_or_create_home_planet
from app.research.repository import (
    get_active_queue_item,
    get_by_planet_and_code,
)
from app.research.service import (
    ResearchQueueBusyError,
    apply_completed_research_queue,
    ensure_research,
    start_research,
)
from app.resources.repository import get_by_planet_id as get_resource_by_planet_id
from app.resources.service import (
    NotEnoughResourcesError,
    ensure_resource_state,
    get_current_resources,
)


def test_start_research_creates_queue_and_spends_resources(db_session) -> None:
    planet = get_or_create_home_planet(db_session, telegram_id=2001)
    ensure_research(db_session, planet.id)
    resource_state = ensure_resource_state(db_session, planet.id)

    metal_before = resource_state.metal
    crystal_before = resource_state.crystal

    start_research(
        db=db_session,
        planet_id=planet.id,
        research_code="metal_mining",
    )

    queue_item = get_active_queue_item(db_session, planet.id)
    assert queue_item is not None
    assert queue_item.research_code == "metal_mining"
    assert queue_item.target_level == 1
    assert queue_item.status == "active"

    updated_resources = get_resource_by_planet_id(db_session, planet.id)
    assert updated_resources is not None
    assert updated_resources.metal < metal_before
    assert updated_resources.crystal < crystal_before


def test_cannot_start_second_research_while_queue_is_active(db_session) -> None:
    planet = get_or_create_home_planet(db_session, telegram_id=2002)
    ensure_research(db_session, planet.id)
    ensure_resource_state(db_session, planet.id)

    start_research(
        db=db_session,
        planet_id=planet.id,
        research_code="metal_mining",
    )

    with pytest.raises(ResearchQueueBusyError):
        start_research(
            db=db_session,
            planet_id=planet.id,
            research_code="energy",
        )


def test_completed_research_levels_up_once(db_session) -> None:
    planet = get_or_create_home_planet(db_session, telegram_id=2003)
    ensure_research(db_session, planet.id)
    ensure_resource_state(db_session, planet.id)

    start_research(
        db=db_session,
        planet_id=planet.id,
        research_code="metal_mining",
    )

    queue_item = get_active_queue_item(db_session, planet.id)
    assert queue_item is not None

    queue_item.finishes_at = datetime.now(timezone.utc) - timedelta(seconds=1)
    db_session.commit()

    apply_completed_research_queue(db_session, planet.id)

    research = get_by_planet_and_code(
        db_session,
        planet.id,
        "metal_mining",
    )
    assert research is not None
    assert research.level == 1
    assert get_active_queue_item(db_session, planet.id) is None

    apply_completed_research_queue(db_session, planet.id)

    research_after_second_apply = get_by_planet_and_code(
        db_session,
        planet.id,
        "metal_mining",
    )
    assert research_after_second_apply is not None
    assert research_after_second_apply.level == 1


def test_not_enough_resources_prevents_research(db_session) -> None:
    planet = get_or_create_home_planet(db_session, telegram_id=2004)
    ensure_research(db_session, planet.id)
    resource_state = ensure_resource_state(db_session, planet.id)

    resource_state.metal = 0
    resource_state.crystal = 0
    db_session.commit()

    with pytest.raises(NotEnoughResourcesError):
        start_research(
            db=db_session,
            planet_id=planet.id,
            research_code="metal_mining",
        )

    assert get_active_queue_item(db_session, planet.id) is None


def test_completed_metal_research_increases_production(db_session) -> None:
    planet = get_or_create_home_planet(db_session, telegram_id=2005)
    ensure_buildings(db_session, planet.id)
    ensure_research(db_session, planet.id)
    ensure_resource_state(db_session, planet.id)

    before = get_current_resources(db_session, planet.id)

    start_research(
        db=db_session,
        planet_id=planet.id,
        research_code="metal_mining",
    )

    queue_item = get_active_queue_item(db_session, planet.id)
    assert queue_item is not None

    queue_item.finishes_at = datetime.now(timezone.utc) - timedelta(seconds=1)
    db_session.commit()

    apply_completed_research_queue(db_session, planet.id)

    after = get_current_resources(db_session, planet.id)

    assert after.metal_per_hour > before.metal_per_hour