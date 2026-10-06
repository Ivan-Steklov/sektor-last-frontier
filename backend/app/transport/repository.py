from sqlalchemy import select
from sqlalchemy.orm import Session

from app.transport.models import TransportMission


def get_active_mission_by_planet_id(
    db: Session,
    planet_id: int,
) -> TransportMission | None:
    return db.scalar(
        select(TransportMission).where(
            TransportMission.planet_id == planet_id,
            TransportMission.status == "active",
        )
    )


def get_last_completed_mission_by_planet_id(
    db: Session,
    planet_id: int,
) -> TransportMission | None:
    return db.scalar(
        select(TransportMission)
        .where(
            TransportMission.planet_id == planet_id,
            TransportMission.status == "completed",
        )
        .order_by(TransportMission.completed_at.desc(), TransportMission.id.desc())
    )


def add_mission(
    db: Session,
    mission: TransportMission,
) -> TransportMission:
    db.add(mission)
    db.flush()

    return mission


def get_active_missions_by_planet_id(
    db: Session,
    planet_id: int,
) -> list[TransportMission]:
    return list(
        db.scalars(
            select(TransportMission)
            .where(
                TransportMission.planet_id == planet_id,
                TransportMission.status == "active",
            )
            .order_by(TransportMission.started_at.desc(), TransportMission.id.desc())
        )
    )