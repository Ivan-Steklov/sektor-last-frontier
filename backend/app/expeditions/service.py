from datetime import datetime, timedelta, timezone

from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.expeditions.models import ExpeditionItem
from app.expeditions.repository import (
    add_expedition,
    get_active_by_planet_id,
    get_last_completed_by_planet_id,
)
from app.expeditions.rules import (
    expedition_duration_seconds,
    roll_expedition_result,
)
from app.expeditions.schemas import (
    ExpeditionQueueResponse,
    ExpeditionResponse,
    ExpeditionResultPayload,
    ExpeditionFleetPayload,
)
from app.research.repository import get_by_planet_and_code as get_research_by_planet_and_code
from app.resources.repository import get_by_planet_id as get_resource_by_planet_id
from app.resources.service import ensure_resource_state, sync_resources
from app.ships.repository import get_by_planet_and_code
from app.ships.service import ensure_ships


class ExpeditionBusyError(Exception):
    pass


class InvalidExpeditionFleetError(Exception):
    pass


class NotEnoughShipsError(Exception):
    pass


def get_current_expedition_state(
    db: Session,
    planet_id: int,
) -> ExpeditionResponse:
    apply_completed_expedition(db, planet_id)

    active_item = get_active_by_planet_id(db, planet_id)
    last_completed = get_last_completed_by_planet_id(db, planet_id)

    last_result = None
    if last_completed is not None and last_completed.result_payload is not None:
        last_result = ExpeditionResultPayload(**last_completed.result_payload)

    return ExpeditionResponse(
        active_expedition=_to_queue_response(active_item),
        last_result=last_result,
    )


def start_expedition(
    db: Session,
    planet_id: int,
    fleet: ExpeditionFleetPayload,
) -> None:
    apply_completed_expedition(db, planet_id)
    ensure_ships(db, planet_id)

    active_item = get_active_by_planet_id(db, planet_id)
    if active_item is not None:
        raise ExpeditionBusyError

    sent_ships = {
        "scout": fleet.scout,
        "transport": fleet.transport,
        "fighter": fleet.fighter,
    }

    if sum(sent_ships.values()) <= 0:
        raise InvalidExpeditionFleetError

    for ship_code, quantity in sent_ships.items():
        ship_state = get_by_planet_and_code(
            db,
            planet_id,
            ship_code,
        )
        current_quantity = ship_state.quantity if ship_state else 0

        if quantity > current_quantity:
            raise NotEnoughShipsError

    for ship_code, quantity in sent_ships.items():
        ship_state = get_by_planet_and_code(
            db,
            planet_id,
            ship_code,
        )
        if ship_state is None:
            raise NotEnoughShipsError

        ship_state.quantity -= quantity

    engines_level = _get_research_level(
        db,
        planet_id,
        "engines",
    )

    now = datetime.now(timezone.utc)
    duration = expedition_duration_seconds(engines_level)

    try:
        add_expedition(
            db,
            ExpeditionItem(
                planet_id=planet_id,
                status="active",
                started_at=now,
                finishes_at=now + timedelta(seconds=duration),
                sent_ships=sent_ships,
                result_payload=None,
            ),
        )
        db.commit()
    except IntegrityError:
        db.rollback()
        raise ExpeditionBusyError


def apply_completed_expedition(
    db: Session,
    planet_id: int,
) -> None:
    active_item = get_active_by_planet_id(db, planet_id)

    if active_item is None:
        return

    now = datetime.now(timezone.utc)
    finishes_at = _as_utc(active_item.finishes_at)

    if finishes_at > now:
        return

    ensure_ships(db, planet_id)
    ensure_resource_state(db, planet_id)
    sync_resources(
        db=db,
        planet_id=planet_id,
        calculated_at=finishes_at,
    )

    recon_level = _get_research_level(
        db,
        planet_id,
        "recon",
    )
    cargo_level = _get_research_level(
        db,
        planet_id,
        "cargo",
    )

    result_payload = roll_expedition_result(
        active_item.sent_ships,
        recon_level=recon_level,
        cargo_level=cargo_level,
    )

    for ship_code, returned_quantity in result_payload["returned_ships"].items():
        ship_state = get_by_planet_and_code(
            db,
            planet_id,
            ship_code,
        )
        if ship_state is not None:
            ship_state.quantity += returned_quantity

    resource_state = get_resource_by_planet_id(db, planet_id)
    if resource_state is not None:
        resource_state.metal += int(result_payload["metal_found"])
        resource_state.crystal += int(result_payload["crystal_found"])

    active_item.status = "completed"
    active_item.completed_at = now
    active_item.result_payload = result_payload

    db.commit()


def _get_research_level(
    db: Session,
    planet_id: int,
    research_code: str,
) -> int:
    research_state = get_research_by_planet_and_code(
        db,
        planet_id,
        research_code,
    )

    if research_state is None:
        return 0

    return research_state.level


def _to_queue_response(
    item: ExpeditionItem | None,
) -> ExpeditionQueueResponse | None:
    if item is None:
        return None

    now = datetime.now(timezone.utc)
    finishes_at = _as_utc(item.finishes_at)
    remaining_seconds = max(
        0,
        int((finishes_at - now).total_seconds()),
    )

    return ExpeditionQueueResponse(
        id=item.id,
        started_at=item.started_at,
        finishes_at=item.finishes_at,
        remaining_seconds=remaining_seconds,
        sent_ships=item.sent_ships,
    )


def _as_utc(value):
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)

    return value.astimezone(timezone.utc)