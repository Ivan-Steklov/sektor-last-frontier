from datetime import datetime

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.galaxy.models import (
    GalaxyKnownSystem,
    GalaxyResourceMission,
    GalaxyScoutMission,
)


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


def get_known_systems_by_planet_id(
    db: Session,
    planet_id: int,
) -> list[GalaxyKnownSystem]:
    return list(
        db.scalars(
            select(GalaxyKnownSystem).where(
                GalaxyKnownSystem.planet_id == planet_id,
            )
        )
    )


def get_known_system(
    db: Session,
    planet_id: int,
    target_galaxy: int,
    target_system: int,
) -> GalaxyKnownSystem | None:
    return db.scalar(
        select(GalaxyKnownSystem).where(
            GalaxyKnownSystem.planet_id == planet_id,
            GalaxyKnownSystem.target_galaxy == target_galaxy,
            GalaxyKnownSystem.target_system == target_system,
        )
    )


def upsert_known_system(
    db: Session,
    planet_id: int,
    target_galaxy: int,
    target_system: int,
    report_payload: dict,
    discovered_at: datetime,
) -> GalaxyKnownSystem:
    known_system = get_known_system(
        db=db,
        planet_id=planet_id,
        target_galaxy=target_galaxy,
        target_system=target_system,
    )

    if known_system is None:
        known_system = GalaxyKnownSystem(
            planet_id=planet_id,
            target_galaxy=target_galaxy,
            target_system=target_system,
            report_payload=report_payload,
            discovered_at=discovered_at,
            updated_at=discovered_at,
        )
        db.add(known_system)
        db.flush()

        return known_system

    known_system.report_payload = report_payload
    known_system.updated_at = discovered_at

    db.flush()

    return known_system


def get_active_resource_mission_by_planet_id(
    db: Session,
    planet_id: int,
) -> GalaxyResourceMission | None:
    return db.scalar(
        select(GalaxyResourceMission).where(
            GalaxyResourceMission.planet_id == planet_id,
            GalaxyResourceMission.status == "active",
        )
    )


def get_last_completed_resource_mission_by_planet_id(
    db: Session,
    planet_id: int,
) -> GalaxyResourceMission | None:
    return db.scalar(
        select(GalaxyResourceMission)
        .where(
            GalaxyResourceMission.planet_id == planet_id,
            GalaxyResourceMission.status == "completed",
        )
        .order_by(GalaxyResourceMission.completed_at.desc())
    )


def add_resource_mission(
    db: Session,
    mission: GalaxyResourceMission,
) -> GalaxyResourceMission:
    db.add(mission)
    db.flush()

    return mission