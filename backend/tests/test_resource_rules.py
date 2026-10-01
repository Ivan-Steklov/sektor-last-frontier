from app.resources.rules import (
    apply_energy_efficiency,
    calculate_stock,
    crystal_production_per_hour,
    energy_efficiency,
    metal_production_per_hour,
    power_plant_energy_production,
    warehouse_capacity,
)


def test_production_is_added_after_one_hour() -> None:
    assert calculate_stock(500, 120, 3600, 10_000) == 620


def test_warehouse_limits_resources() -> None:
    assert calculate_stock(9_990, 120, 3600, 10_000) == 10_000


def test_negative_time_does_not_reduce_resources() -> None:
    assert calculate_stock(500, 120, -10, 10_000) == 500


def test_metal_production_grows_with_level() -> None:
    assert metal_production_per_hour(2) > metal_production_per_hour(1)


def test_crystal_production_grows_with_level() -> None:
    assert crystal_production_per_hour(2) > crystal_production_per_hour(1)


def test_warehouse_capacity_grows_with_level() -> None:
    assert warehouse_capacity(2) > warehouse_capacity(1)


def test_power_plant_energy_grows_with_level() -> None:
    assert power_plant_energy_production(2) > power_plant_energy_production(1)


def test_energy_efficiency_is_full_when_energy_is_enough() -> None:
    assert energy_efficiency(produced=100, consumed=50) == 1.0


def test_energy_efficiency_is_reduced_when_energy_is_not_enough() -> None:
    assert energy_efficiency(produced=50, consumed=100) == 0.5


def test_energy_efficiency_reduces_production() -> None:
    assert apply_energy_efficiency(100, 0.5) == 50