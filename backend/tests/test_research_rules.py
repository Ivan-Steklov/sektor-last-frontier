from app.research.rules import (
    required_research_center_level,
    research_center_requirement_met,
    research_production_multiplier,
    research_upgrade_cost,
    research_upgrade_seconds,
)


def test_first_research_level_has_base_cost() -> None:
    metal, crystal = research_upgrade_cost("metal_mining", 0)

    assert metal == 200
    assert crystal == 100


def test_research_cost_grows_with_level() -> None:
    current = research_upgrade_cost("metal_mining", 0)
    next_level = research_upgrade_cost("metal_mining", 1)

    assert next_level[0] > current[0]
    assert next_level[1] > current[1]


def test_research_time_grows_with_level() -> None:
    assert research_upgrade_seconds("energy", 1) > research_upgrade_seconds(
        "energy",
        0,
    )


def test_production_multiplier_grows_with_level() -> None:
    assert research_production_multiplier(1) == 1.08
    assert research_production_multiplier(2) > research_production_multiplier(1)


def test_required_research_center_level_matches_next_level() -> None:
    assert required_research_center_level(1) == 1
    assert required_research_center_level(3) == 3


def test_research_center_requirement_check() -> None:
    assert research_center_requirement_met(2, 2) is True
    assert research_center_requirement_met(1, 2) is False