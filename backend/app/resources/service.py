from datetime import datetime, timezone

from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.buildings.repository import get_by_planet_and_code
from app.resources.models import ResourceState
from app.resources.repository import get_by_planet_id
from app.resources.rules import (
    INITIAL_CRYSTAL,
    INITIAL_METAL,
    INITIAL_POPULATION,
    calculate_stock,
    crystal_production_per_hour,
    energy_balance,
    metal_production_per_hour,
    warehouse_capacity,
)
from app.resources.schemas import ResourcesResponse


def ensure_resource_state(
    db: Session,
    planet_id: int,
) -> ResourceState:
    state = get_by_planet_id(db, planet_id)

    if state is not None:
        return state

    state = ResourceState(
        planet_id=planet_id,
        metal=INITIAL_METAL,
        crystal=INITIAL_CRYSTAL,
        population=INITIAL_POPULATION,
        last_calculated_at=datetime.now(timezone.utc),
    )

    db.add(state)

    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        state = get_by_planet_id(db, planet_id)

        if state is None:
            raise

        return state

    db.refresh(state)
    return state


def get_current_resources(
    db: Session,
    planet_id: int,
) -> ResourcesResponse:
    state = ensure_resource_state(db, planet_id)

    metal_mine = get_by_planet_and_code(
        db,
        planet_id,
        "metal_mine",
    )
    crystal_mine = get_by_planet_and_code(
        db,
        planet_id,
        "crystal_mine",
    )
    warehouse = get_by_planet_and_code(
        db,
        planet_id,
        "warehouse",
    )

    metal_level = metal_mine.level if metal_mine else 1
    crystal_level = crystal_mine.level if crystal_mine else 1
    warehouse_level = warehouse.level if warehouse else 1

    metal_per_hour = metal_production_per_hour(metal_level)
    crystal_per_hour = crystal_production_per_hour(crystal_level)
    current_capacity = warehouse_capacity(warehouse_level)

    now = datetime.now(timezone.utc)
    elapsed_seconds = int(
        (
            now - _as_utc(state.last_calculated_at)
        ).total_seconds()
    )

    return ResourcesResponse(
        metal=calculate_stock(
            state.metal,
            metal_per_hour,
            elapsed_seconds,
            current_capacity,
        ),
        crystal=calculate_stock(
            state.crystal,
            crystal_per_hour,
            elapsed_seconds,
            current_capacity,
        ),
        energy=energy_balance(),
        population=state.population,
        metal_per_hour=metal_per_hour,
        crystal_per_hour=crystal_per_hour,
        warehouse_capacity=current_capacity,
        calculated_at=now,
    )


def _as_utc(value: datetime) -> datetime:
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)

    return value.astimezone(timezone.utc)