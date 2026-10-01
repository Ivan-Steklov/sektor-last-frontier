SHIP_COSTS: dict[str, tuple[int, int]] = {
    "scout": (120, 80),
    "transport": (220, 140),
    "fighter": (260, 180),
}

SHIP_BUILD_SECONDS: dict[str, int] = {
    "scout": 20,
    "transport": 35,
    "fighter": 45,
}

SHIPYARD_REQUIREMENTS: dict[str, int] = {
    "scout": 1,
    "transport": 1,
    "fighter": 2,
}


def ship_cost(
    ship_code: str,
    quantity: int,
) -> tuple[int, int]:
    base_metal, base_crystal = SHIP_COSTS[ship_code]

    return (
        base_metal * quantity,
        base_crystal * quantity,
    )


def ship_build_seconds(
    ship_code: str,
    quantity: int,
) -> int:
    return SHIP_BUILD_SECONDS[ship_code] * quantity


def required_shipyard_level(ship_code: str) -> int:
    return SHIPYARD_REQUIREMENTS[ship_code]


def shipyard_requirement_met(
    shipyard_level: int,
    ship_code: str,
) -> bool:
    return shipyard_level >= required_shipyard_level(ship_code)