from app.research.rules import (
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