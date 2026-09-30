INITIAL_METAL = 500
INITIAL_CRYSTAL = 200
INITIAL_POPULATION = 100

METAL_PER_HOUR = 120
CRYSTAL_PER_HOUR = 60

ENERGY_PRODUCTION = 50
ENERGY_CONSUMPTION = 0

WAREHOUSE_CAPACITY = 10_000


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
    return min(capacity, stored + produced)