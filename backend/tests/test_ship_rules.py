from app.ships.rules import (
    required_shipyard_level,
    ship_build_seconds,
    ship_cost,
    shipyard_requirement_met,
)


def test_ship_cost_multiplies_by_quantity() -> None:
    metal, crystal = ship_cost("scout", 3)

    assert metal == 360
    assert crystal == 240


def test_ship_build_time_multiplies_by_quantity() -> None:
    assert ship_build_seconds("transport", 3) == 105


def test_required_shipyard_level() -> None:
    assert required_shipyard_level("scout") == 1
    assert required_shipyard_level("fighter") == 2


def test_shipyard_requirement_check() -> None:
    assert shipyard_requirement_met(2, "fighter") is True
    assert shipyard_requirement_met(1, "fighter") is False