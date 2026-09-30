from math import floor


INITIAL_METAL = 500
INITIAL_CRYSTAL = 200
INITIAL_POPULATION = 100

BASE_METAL_PER_HOUR = 60
BASE_CRYSTAL_PER_HOUR = 30

ENERGY_PRODUCTION = 50
ENERGY_CONSUMPTION = 0

BASE_WAREHOUSE_CAPACITY = 10_000
WAREHOUSE_CAPACITY_PER_LEVEL = 5_000


def metal_production_per_hour(level: int) -> int:
    return floor(BASE_METAL_PER_HOUR * level**1.35)


def crystal_production_per_hour(level: int) -> int:
    return floor(BASE_CRYSTAL_PER_HOUR * level**1.35)


def warehouse_capacity(level: int) -> int:
    return BASE_WAREHOUSE_CAPACITY + (
        max(level - 1, 0) * WAREHOUSE_CAPACITY_PER_LEVEL
    )


def energy_balance() -> int:
    return ENERGY_PRODUCTION - ENERGY_CONSUMPTION


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