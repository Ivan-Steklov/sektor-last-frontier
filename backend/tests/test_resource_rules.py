from app.resources.rules import (
    calculate_stock,
    crystal_production_per_hour,
    metal_production_per_hour,
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