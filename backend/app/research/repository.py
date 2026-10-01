from sqlalchemy import select
from sqlalchemy.orm import Session

from app.research.models import ResearchQueueItem, ResearchState


def get_by_planet_id(
    db: Session,
    planet_id: int,
) -> list[ResearchState]:
    return list(
        db.scalars(
            select(ResearchState)
            .where(ResearchState.planet_id == planet_id)
            .order_by(ResearchState.id)
        )
    )


def get_by_planet_and_code(
    db: Session,
    planet_id: int,
    research_code: str,
) -> ResearchState | None:
    return db.scalar(
        select(ResearchState).where(
            ResearchState.planet_id == planet_id,
            ResearchState.research_code == research_code,
        )
    )


def add_research(
    db: Session,
    research: ResearchState,
) -> ResearchState:
    db.add(research)
    db.flush()

    return research


def get_active_queue_item(
    db: Session,
    planet_id: int,
) -> ResearchQueueItem | None:
    return db.scalar(
        select(ResearchQueueItem).where(
            ResearchQueueItem.planet_id == planet_id,
            ResearchQueueItem.status == "active",
        )
    )


def add_queue_item(
    db: Session,
    queue_item: ResearchQueueItem,
) -> ResearchQueueItem:
    db.add(queue_item)
    db.flush()

    return queue_item