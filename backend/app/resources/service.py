from datetime import datetime, timezone

from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.buildings.repository import get_by_planet_id
from app.resources.models import ResourceState
from app.resources.repository import get_by_planet_id as get_resource_by_planet_id
from app.resources.rules import (
    INITIAL_CRYSTAL,
    INITIAL_METAL,
    INITIAL_POPULATION,
    apply_energy_efficiency,
    building_energy_consumption,
    calculate_stock,
    crystal_production_per_hour,
    energy_efficiency,
    metal_production_per_hour,
    power_plant_energy_production,
    warehouse_capacity,
)
from app.resources.schemas import ResourcesResponse


class NotEnoughResourcesError(Exception):
    pass


def ensure_resource_state(
    db: Session,
    planet_id: int,
) -> ResourceState:
    state = get_resource_by_planet_id(db, planet_id)

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
        state = get_resource_by_planet_id(db, planet_id)

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

    current = calculate_current_resource_values(
        db=db,
        planet_id=planet_id,
        state=state,
    )

    return ResourcesResponse(**current)


def sync_resources(
    db: Session,
    planet_id: int,
    calculated_at: datetime | None = None,
) -> ResourceState:
    """
    Фиксирует рассчитанные ресурсы в базе.

    Используется перед важными действиями:
    - списание ресурсов;
    - завершение строительства;
    - будущие исследования;
    - будущая верфь.

    Если calculated_at передан, ресурсы фиксируются именно на этот момент.
    Это важно при завершении строительства: до finishes_at старые уровни,
    после finishes_at — новые уровни.
    """
    state = ensure_resource_state(db, planet_id)

    target_time = calculated_at or datetime.now(timezone.utc)
    target_time = _as_utc(target_time)

    last_calculated_at = _as_utc(state.last_calculated_at)

    if target_time < last_calculated_at:
        target_time = last_calculated_at

    current = calculate_current_resource_values(
        db=db,
        planet_id=planet_id,
        state=state,
        calculated_at=target_time,
    )

    state.metal = current["metal"]
    state.crystal = current["crystal"]
    state.last_calculated_at = target_time

    db.flush()

    return state


def spend_resources(
    db: Session,
    planet_id: int,
    metal_cost: int,
    crystal_cost: int,
) -> None:
    state = sync_resources(
        db=db,
        planet_id=planet_id,
    )

    if state.metal < metal_cost or state.crystal < crystal_cost:
        raise NotEnoughResourcesError

    state.metal -= metal_cost
    state.crystal -= crystal_cost

    db.flush()


def calculate_current_resource_values(
    db: Session,
    planet_id: int,
    state: ResourceState,
    calculated_at: datetime | None = None,
) -> dict:
    buildings = get_by_planet_id(
        db=db,
        planet_id=planet_id,
    )

    levels_by_code = {
        building.building_code: building.level
        for building in buildings
    }

    metal_mine_level = levels_by_code.get("metal_mine", 1)
    crystal_mine_level = levels_by_code.get("crystal_mine", 1)
    power_plant_level = levels_by_code.get("power_plant", 1)
    warehouse_level = levels_by_code.get("warehouse", 1)

    raw_metal_per_hour = metal_production_per_hour(metal_mine_level)
    raw_crystal_per_hour = crystal_production_per_hour(crystal_mine_level)

    energy_produced = power_plant_energy_production(power_plant_level)
    energy_consumed = sum(
        building_energy_consumption(
            building_code=building.building_code,
            level=building.level,
        )
        for building in buildings
    )

    efficiency = energy_efficiency(
        produced=energy_produced,
        consumed=energy_consumed,
    )

    metal_per_hour = apply_energy_efficiency(
        production_per_hour=raw_metal_per_hour,
        efficiency=efficiency,
    )
    crystal_per_hour = apply_energy_efficiency(
        production_per_hour=raw_crystal_per_hour,
        efficiency=efficiency,
    )

    current_capacity = warehouse_capacity(warehouse_level)

    now = calculated_at or datetime.now(timezone.utc)
    now = _as_utc(now)

    elapsed_seconds = int(
        (
            now - _as_utc(state.last_calculated_at)
        ).total_seconds()
    )

    return {
        "metal": calculate_stock(
            state.metal,
            metal_per_hour,
            elapsed_seconds,
            current_capacity,
        ),
        "crystal": calculate_stock(
            state.crystal,
            crystal_per_hour,
            elapsed_seconds,
            current_capacity,
        ),
        "energy": energy_produced - energy_consumed,
        "population": state.population,
        "metal_per_hour": metal_per_hour,
        "crystal_per_hour": crystal_per_hour,
        "energy_produced": energy_produced,
        "energy_consumed": energy_consumed,
        "energy_efficiency_percent": int(efficiency * 100),
        "warehouse_capacity": current_capacity,
        "calculated_at": now,
    }


def _as_utc(value: datetime) -> datetime:
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)

    return value.astimezone(timezone.utc)