from app.resources.rules import calculate_stock


def test_production_is_added_after_one_hour() -> None:
    assert calculate_stock(500, 120, 3600, 10_000) == 620


def test_warehouse_limits_resources() -> None:
    assert calculate_stock(9_990, 120, 3600, 10_000) == 10_000


def test_negative_time_does_not_reduce_resources() -> None:
    assert calculate_stock(500, 120, -10, 10_000) == 500