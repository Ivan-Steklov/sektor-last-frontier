from datetime import datetime, timedelta, timezone

import pytest

from app.expeditions.repository import get_active_by_planet_id
from app.expeditions.schemas import ExpeditionFleetPayload
from app.expeditions.service import (
    ExpeditionBusyError,
    InvalidExpeditionFleetError,
    NotEnoughShipsError,
    apply_completed_expedition,
    get_current_expedition_state,
    start_expedition,
)
from app.planets.service import get_or_create_home_planet
from app.resources.repository import get_by_planet_id as get_resource_by_planet_id
from app.resources.service import ensure_resource_state
from app.ships.repository import get_by_planet_and_code
from app.ships.service import ensure_ships


def test_start_expedition_removes_ships_from_planet(db_session) -> None:
    planet = get_or_create_home_planet(db_session, telegram_id=4001)
    ensure_ships(db_session, planet.id)
    ensure_resource_state(db_session, planet.id)

    scout = get_by_planet_and_code(db_session, planet.id, "scout")
    transport = get_by_planet_and_code(db_session, planet.id, "transport")
    fighter = get_by_planet_and_code(db_session, planet.id, "fighter")

    assert scout is not None
    assert transport is not None
    assert fighter is not None

    scout.quantity = 5
    transport.quantity = 2
    fighter.quantity = 1
    db_session.commit()

    start_expedition(
        db=db_session,
        planet_id=planet.id,
        fleet=ExpeditionFleetPayload(
            scout=2,
            transport=1,
            fighter=1,
        ),
    )

    scout_after = get_by_planet_and_code(db_session, planet.id, "scout")
    transport_after = get_by_planet_and_code(db_session, planet.id, "transport")
    fighter_after = get_by_planet_and_code(db_session, planet.id, "fighter")

    assert scout_after is not None
    assert transport_after is not None
    assert fighter_after is not None

    assert scout_after.quantity == 3
    assert transport_after.quantity == 1
    assert fighter_after.quantity == 0


def test_cannot_start_second_expedition_while_active(db_session) -> None:
    planet = get_or_create_home_planet(db_session, telegram_id=4002)
    ensure_ships(db_session, planet.id)

    scout = get_by_planet_and_code(db_session, planet.id, "scout")
    assert scout is not None
    scout.quantity = 5
    db_session.commit()

    start_expedition(
        db=db_session,
        planet_id=planet.id,
        fleet=ExpeditionFleetPayload(scout=1, transport=0, fighter=0),
    )

    with pytest.raises(ExpeditionBusyError):
        start_expedition(
            db=db_session,
            planet_id=planet.id,
            fleet=ExpeditionFleetPayload(scout=1, transport=0, fighter=0),
        )


def test_empty_fleet_is_rejected(db_session) -> None:
    planet = get_or_create_home_planet(db_session, telegram_id=4003)
    ensure_ships(db_session, planet.id)

    with pytest.raises(InvalidExpeditionFleetError):
        start_expedition(
            db=db_session,
            planet_id=planet.id,
            fleet=ExpeditionFleetPayload(scout=0, transport=0, fighter=0),
        )


def test_not_enough_ships_is_rejected(db_session) -> None:
    planet = get_or_create_home_planet(db_session, telegram_id=4004)
    ensure_ships(db_session, planet.id)

    with pytest.raises(NotEnoughShipsError):
        start_expedition(
            db=db_session,
            planet_id=planet.id,
            fleet=ExpeditionFleetPayload(scout=1, transport=0, fighter=0),
        )


def test_completed_expedition_returns_last_result(db_session, monkeypatch) -> None:
    planet = get_or_create_home_planet(db_session, telegram_id=4005)
    ensure_ships(db_session, planet.id)
    ensure_resource_state(db_session, planet.id)

    scout = get_by_planet_and_code(db_session, planet.id, "scout")
    transport = get_by_planet_and_code(db_session, planet.id, "transport")
    fighter = get_by_planet_and_code(db_session, planet.id, "fighter")

    assert scout is not None
    assert transport is not None
    assert fighter is not None

    scout.quantity = 5
    transport.quantity = 1
    fighter.quantity = 1
    db_session.commit()

    start_expedition(
        db=db_session,
        planet_id=planet.id,
        fleet=ExpeditionFleetPayload(
            scout=2,
            transport=1,
            fighter=1,
        ),
    )

    active = get_active_by_planet_id(db_session, planet.id)
    assert active is not None
    active.finishes_at = datetime.now(timezone.utc) - timedelta(seconds=1)
    db_session.commit()

    monkeypatch.setattr(
        "app.expeditions.service.roll_expedition_result",
        lambda sent_ships, recon_level, cargo_level: {
            "outcome": "metal",
            "metal_found": 500,
            "crystal_found": 0,
            "lost_ships": {},
            "returned_ships": dict(sent_ships),
            "description": "Найден металл.",
        },
    )

    apply_completed_expedition(db_session, planet.id)

    state = get_current_expedition_state(db_session, planet.id)

    assert state.active_expedition is None
    assert state.last_result is not None
    assert state.last_result.outcome == "metal"
    assert state.last_result.metal_found == 500

    scout_after = get_by_planet_and_code(db_session, planet.id, "scout")
    transport_after = get_by_planet_and_code(db_session, planet.id, "transport")
    fighter_after = get_by_planet_and_code(db_session, planet.id, "fighter")

    assert scout_after is not None
    assert transport_after is not None
    assert fighter_after is not None

    assert scout_after.quantity == 5
    assert transport_after.quantity == 1
    assert fighter_after.quantity == 1

    resource_state = get_resource_by_planet_id(db_session, planet.id)
    assert resource_state is not None
    assert resource_state.metal >= 500