from sqlalchemy import select
from sqlalchemy.orm import Session

from app.galaxy.models import GalaxyScoutMission


def get_active_scout_mission_by_planet_id(
    db: Session,
    planet_id: int,
) -> GalaxyScoutMission | None:
    return db.scalar(
        select(GalaxyScoutMission).where(
            GalaxyScoutMission.planet_id == planet_id,
            GalaxyScoutMission.status == "active",
        )
    )


def get_last_completed_scout_mission_by_planet_id(
    db: Session,
    planet_id: int,
) -> GalaxyScoutMission | None:
    return db.scalar(
        select(GalaxyScoutMission)
        .where(
            GalaxyScoutMission.planet_id == planet_id,
            GalaxyScoutMission.status == "completed",
        )
        .order_by(GalaxyScoutMission.completed_at.desc())
    )


def add_scout_mission(
    db: Session,
    mission: GalaxyScoutMission,
) -> GalaxyScoutMission:
    db.add(mission)
    db.flush()

    return mission