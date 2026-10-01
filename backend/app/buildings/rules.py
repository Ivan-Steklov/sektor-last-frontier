from math import floor


BASE_BUILDING_COSTS: dict[str, tuple[int, int]] = {
    "metal_mine": (120, 40),
    "crystal_mine": (100, 60),
    "power_plant": (80, 30),
    "warehouse": (150, 80),
    "shipyard": (300, 150),
    "research_center": (250, 200),
    "defense_module": (200, 120),
}


BASE_BUILD_SECONDS: dict[str, int] = {
    "metal_mine": 30,
    "crystal_mine": 35,
    "power_plant": 30,
    "warehouse": 45,
    "shipyard": 60,
    "research_center": 60,
    "defense_module": 50,
}


def building_upgrade_cost(
    building_code: str,
    current_level: int,
) -> tuple[int, int]:
    base_metal, base_crystal = BASE_BUILDING_COSTS[building_code]
    multiplier = current_level**1.6

    return (
        floor(base_metal * multiplier),
        floor(base_crystal * multiplier),
    )


def building_upgrade_seconds(
    building_code: str,
    current_level: int,
) -> int:
    base_seconds = BASE_BUILD_SECONDS[building_code]

    return floor(base_seconds * current_level**1.25)