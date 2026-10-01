from math import floor


INITIAL_METAL = 500
INITIAL_CRYSTAL = 200
INITIAL_POPULATION = 100

BASE_METAL_PER_HOUR = 60
BASE_CRYSTAL_PER_HOUR = 30

BASE_WAREHOUSE_CAPACITY = 10_000
WAREHOUSE_CAPACITY_PER_LEVEL = 5_000


def metal_production_per_hour(level: int) -> int:
    return floor(BASE_METAL_PER_HOUR * level**1.35)


def crystal_production_per_hour(level: int) -> int:
    return floor(BASE_CRYSTAL_PER_HOUR * level**1.35)


def power_plant_energy_production(level: int) -> int:
    return floor(80 * level**1.4)


def metal_mine_energy_consumption(level: int) -> int:
    return floor(20 * level**1.25)


def crystal_mine_energy_consumption(level: int) -> int:
    return floor(25 * level**1.25)


def building_energy_consumption(
    building_code: str,
    level: int,
) -> int:
    if building_code == "metal_mine":
        return metal_mine_energy_consumption(level)

    if building_code == "crystal_mine":
        return crystal_mine_energy_consumption(level)

    if building_code == "shipyard":
        return floor(10 * level**1.15)

    if building_code == "research_center":
        return floor(12 * level**1.15)

    if building_code == "defense_module":
        return floor(8 * level**1.1)

    return 0


def energy_efficiency(
    produced: int,
    consumed: int,
) -> float:
    if consumed <= 0:
        return 1.0

    if produced >= consumed:
        return 1.0

    return produced / consumed


def apply_energy_efficiency(
    production_per_hour: int,
    efficiency: float,
) -> int:
    return floor(production_per_hour * efficiency)


def warehouse_capacity(level: int) -> int:
    return BASE_WAREHOUSE_CAPACITY + (
        max(level - 1, 0) * WAREHOUSE_CAPACITY_PER_LEVEL
    )


def calculate_stock(
    stored: int,
    per_hour: int,
    elapsed_seconds: int,
    capacity: int,
) -> int:
    if elapsed_seconds < 0:
        elapsed_seconds = 0

    produced = per_hour * elapsed_seconds // 3600

    return min(
        capacity,
        stored + produced,
    )