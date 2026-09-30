from datetime import datetime, timezone

from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.resources.models import ResourceState
from app.resources.repository import get_by_planet_id
from app.resources.rules import (
    CRYSTAL_PER_HOUR,
    INITIAL_CRYSTAL,
    INITIAL_METAL,
    INITIAL_POPULATION,
    METAL_PER_HOUR,
    WAREHOUSE_CAPACITY,
    calculate_stock,
    energy_balance,
)
from app.resources.schemas import ResourcesResponse


def ensure_resource_state(db: Session, planet_id: int) -> ResourceState:
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


def get_current_resources(db: Session, planet_id: int) -> ResourcesResponse:
    state = ensure_resource_state(db, planet_id)
    now = datetime.now(timezone.utc)
    elapsed_seconds = int((now - _as_utc(state.last_calculated_at)).total_seconds())

    return ResourcesResponse(
        metal=calculate_stock(
            state.metal,
            METAL_PER_HOUR,
            elapsed_seconds,
            WAREHOUSE_CAPACITY,
        ),
        crystal=calculate_stock(
            state.crystal,
            CRYSTAL_PER_HOUR,
            elapsed_seconds,
            WAREHOUSE_CAPACITY,
        ),
        energy=energy_balance(),
        population=state.population,
        metal_per_hour=METAL_PER_HOUR,
        crystal_per_hour=CRYSTAL_PER_HOUR,
        warehouse_capacity=WAREHOUSE_CAPACITY,
        calculated_at=now,
    )


def _as_utc(value: datetime) -> datetime:
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)

    return value.astimezone(timezone.utc)