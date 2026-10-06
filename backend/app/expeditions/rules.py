def expedition_duration_seconds(
    engines_level: int,
) -> int:
    base_seconds = 600
    reduction_percent = engines_level * 5

    adjusted_seconds = int(base_seconds * (1 - reduction_percent / 100))

    return max(300, adjusted_seconds)


def expedition_outcome_chances(
    recon_level: int,
) -> dict[str, int]:
    empty_chance = 30
    metal_chance = 25
    crystal_chance = 25
    loss_chance = 20

    reduction = min(loss_chance - 5, recon_level * 3)

    loss_chance -= reduction
    metal_chance += reduction // 2
    crystal_chance += reduction - (reduction // 2)

    return {
        "empty": empty_chance,
        "metal": metal_chance,
        "crystal": crystal_chance,
        "loss": loss_chance,
    }


def cargo_multiplier(
    cargo_level: int,
) -> float:
    return 1 + (cargo_level * 0.10)


def roll_expedition_result(
    sent_ships: dict[str, int],
    recon_level: int,
    cargo_level: int,
) -> dict:
    chances = expedition_outcome_chances(recon_level)
    roll = _roll_percent()

    total_ships = sum(sent_ships.values())
    scout_count = sent_ships.get("scout", 0)
    transport_count = sent_ships.get("transport", 0)
    fighter_count = sent_ships.get("fighter", 0)

    empty_border = chances["empty"]
    metal_border = empty_border + chances["metal"]
    crystal_border = metal_border + chances["crystal"]

    if roll <= empty_border:
        return {
            "outcome": "empty",
            "metal_found": 0,
            "crystal_found": 0,
            "lost_ships": {},
            "returned_ships": dict(sent_ships),
            "description": "Экспедиция ничего не обнаружила.",
        }

    if roll <= metal_border:
        base_metal = 80 * total_ships + 40 * scout_count + 120 * transport_count
        metal_found = int(base_metal * cargo_multiplier(cargo_level))

        return {
            "outcome": "metal",
            "metal_found": metal_found,
            "crystal_found": 0,
            "lost_ships": {},
            "returned_ships": dict(sent_ships),
            "description": f"Экспедиция обнаружила залежи металла: {metal_found}.",
        }

    if roll <= crystal_border:
        base_crystal = 60 * total_ships + 30 * scout_count + 90 * transport_count
        crystal_found = int(base_crystal * cargo_multiplier(cargo_level))

        return {
            "outcome": "crystal",
            "metal_found": 0,
            "crystal_found": crystal_found,
            "lost_ships": {},
            "returned_ships": dict(sent_ships),
            "description": f"Экспедиция обнаружила кристаллы: {crystal_found}.",
        }

    lost_scout = min(scout_count, 1 if scout_count > 0 else 0)
    lost_transport = min(transport_count, 1 if transport_count > 1 else 0)
    lost_fighter = min(fighter_count, 1 if fighter_count > 0 else 0)

    lost_ships = {
        "scout": lost_scout,
        "transport": lost_transport,
        "fighter": lost_fighter,
    }
    returned_ships = {
        "scout": scout_count - lost_scout,
        "transport": transport_count - lost_transport,
        "fighter": fighter_count - lost_fighter,
    }

    return {
        "outcome": "loss",
        "metal_found": 0,
        "crystal_found": 0,
        "lost_ships": lost_ships,
        "returned_ships": returned_ships,
        "description": "Экспедиция попала в аномалию и понесла потери.",
    }


def _roll_percent() -> int:
    import random

    return random.randint(1, 100)