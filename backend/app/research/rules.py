from math import floor


BASE_RESEARCH_COSTS: dict[str, tuple[int, int]] = {
    "metal_mining": (200, 100),
    "crystal_mining": (180, 140),
    "energy": (150, 120),
    "armor": (250, 180),
    "weapons": (280, 200),
    "shields": (260, 220),
    "engines": (300, 200),
    "recon": (180, 160),
    "cargo": (160, 140),
    "flight_range": (220, 180),
}


BASE_RESEARCH_SECONDS: dict[str, int] = {
    "metal_mining": 40,
    "crystal_mining": 45,
    "energy": 40,
    "armor": 55,
    "weapons": 60,
    "shields": 60,
    "engines": 70,
    "recon": 50,
    "cargo": 45,
    "flight_range": 65,
}


def research_upgrade_cost(
    research_code: str,
    current_level: int,
) -> tuple[int, int]:
    base_metal, base_crystal = BASE_RESEARCH_COSTS[research_code]
    multiplier = 1.6**current_level

    return (
        floor(base_metal * multiplier),
        floor(base_crystal * multiplier),
    )


def research_upgrade_seconds(
    research_code: str,
    current_level: int,
) -> int:
    base_seconds = BASE_RESEARCH_SECONDS[research_code]

    return floor(base_seconds * (current_level + 1) ** 1.2)


def research_production_multiplier(level: int) -> float:
    return 1 + 0.08 * level