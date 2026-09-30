from sqlalchemy import select
from sqlalchemy.orm import Session

from app.resources.models import ResourceState


def get_by_planet_id(db: Session, planet_id: int) -> ResourceState | None:
    return db.scalar(
        select(ResourceState).where(ResourceState.planet_id == planet_id)
    )