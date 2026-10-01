from datetime import datetime, timedelta, timezone

from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.research.catalog import RESEARCH, RESEARCH_BY_CODE
from app.research.models import ResearchQueueItem, ResearchState
from app.research.repository import (
    add_queue_item,
    add_research,
    get_active_queue_item,
    get_by_planet_and_code,
    get_by_planet_id,
)
from app.research.rules import (
    research_upgrade_cost,
    research_upgrade_seconds,
)
from app.research.schemas import (
    ResearchItemResponse,
    ResearchListResponse,
    ResearchQueueResponse,
)
from app.resources.service import (
    NotEnoughResourcesError,
    spend_resources,
    sync_resources,
)


class UnknownResearchError(Exception):
    pass


class ResearchQueueBusyError(Exception):
    pass


def ensure_research(
    db: Session,
    planet_id: int,
) -> list[ResearchState]:
    existing_research = get_by_planet_id(db, planet_id)
    existing_codes = {
        research.research_code
        for research in existing_research
    }

    created_any = False

    for definition in RESEARCH:
        if definition.code in existing_codes:
            continue

        add_research(
            db,
            ResearchState(
                planet_id=planet_id,
                research_code=definition.code,
                level=0,
            ),
        )
        created_any = True

    if created_any:
        try:
            db.commit()
        except IntegrityError:
            db.rollback()

    return get_by_planet_id(db, planet_id)


def apply_completed_research_queue(
    db: Session,
    planet_id: int,
) -> None:
    queue_item = get_active_queue_item(db, planet_id)

    if queue_item is None:
        return

    now = datetime.now(timezone.utc)
    finishes_at = _as_utc(queue_item.finishes_at)

    if finishes_at > now:
        return

    research = get_by_planet_and_code(
        db,
        planet_id,
        queue_item.research_code,
    )

    if research is None:
        ensure_research(db, planet_id)
        research = get_by_planet_and_code(
            db,
            planet_id,
            queue_item.research_code,
        )

    if research is None:
        raise UnknownResearchError

    sync_resources(
        db=db,
        planet_id=planet_id,
        calculated_at=finishes_at,
    )

    research.level = queue_item.target_level
    queue_item.status = "completed"
    queue_item.completed_at = now

    db.commit()


def get_current_research(
    db: Session,
    planet_id: int,
) -> ResearchListResponse:
    apply_completed_research_queue(db, planet_id)

    states = ensure_research(db, planet_id)
    active_queue = get_active_queue_item(db, planet_id)

    states_by_code = {
        state.research_code: state
        for state in states
    }

    research_items = []

    for definition in RESEARCH:
        state = states_by_code[definition.code]
        metal_cost, crystal_cost = research_upgrade_cost(
            definition.code,
            state.level,
        )
        upgrade_seconds = research_upgrade_seconds(
            definition.code,
            state.level,
        )
        is_in_queue = (
            active_queue is not None
            and active_queue.research_code == definition.code
        )

        research_items.append(
            ResearchItemResponse(
                code=definition.code,
                name=definition.name,
                description=definition.description,
                effect=definition.effect,
                level=state.level,
                next_level=state.level + 1,
                upgrade_metal_cost=metal_cost,
                upgrade_crystal_cost=crystal_cost,
                upgrade_seconds=upgrade_seconds,
                can_research=active_queue is None,
                is_in_queue=is_in_queue,
            )
        )

    return ResearchListResponse(
        research=research_items,
        queue=_to_queue_response(active_queue),
    )


def start_research(
    db: Session,
    planet_id: int,
    research_code: str,
) -> None:
    if research_code not in RESEARCH_BY_CODE:
        raise UnknownResearchError

    apply_completed_research_queue(db, planet_id)
    ensure_research(db, planet_id)

    active_queue = get_active_queue_item(db, planet_id)

    if active_queue is not None:
        raise ResearchQueueBusyError

    research = get_by_planet_and_code(
        db,
        planet_id,
        research_code,
    )

    if research is None:
        raise UnknownResearchError

    metal_cost, crystal_cost = research_upgrade_cost(
        research_code,
        research.level,
    )
    upgrade_seconds = research_upgrade_seconds(
        research_code,
        research.level,
    )

    try:
        spend_resources(
            db=db,
            planet_id=planet_id,
            metal_cost=metal_cost,
            crystal_cost=crystal_cost,
        )

        now = datetime.now(timezone.utc)

        add_queue_item(
            db,
            ResearchQueueItem(
                planet_id=planet_id,
                research_code=research_code,
                target_level=research.level + 1,
                status="active",
                started_at=now,
                finishes_at=now + timedelta(seconds=upgrade_seconds),
            ),
        )

        db.commit()

    except NotEnoughResourcesError:
        db.rollback()
        raise
    except IntegrityError:
        db.rollback()
        raise ResearchQueueBusyError


def _to_queue_response(
    queue_item: ResearchQueueItem | None,
) -> ResearchQueueResponse | None:
    if queue_item is None:
        return None

    now = datetime.now(timezone.utc)
    finishes_at = _as_utc(queue_item.finishes_at)
    remaining_seconds = max(
        0,
        int((finishes_at - now).total_seconds()),
    )
    definition = RESEARCH_BY_CODE[queue_item.research_code]

    return ResearchQueueResponse(
        id=queue_item.id,
        research_code=queue_item.research_code,
        research_name=definition.name,
        target_level=queue_item.target_level,
        started_at=queue_item.started_at,
        finishes_at=queue_item.finishes_at,
        remaining_seconds=remaining_seconds,
    )


def _as_utc(value: datetime) -> datetime:
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)

    return value.astimezone(timezone.utc)