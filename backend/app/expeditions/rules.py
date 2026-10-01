import random


EXPEDITION_DURATION_SECONDS = 60


def expedition_duration_seconds() -> int:
    return EXPEDITION_DURATION_SECONDS


def roll_expedition_result(
    sent_ships: dict[str, int],
) -> dict:
    roll = random.randint(1, 100)

    total_ships = sum(sent_ships.values())
    scout_count = sent_ships.get("scout", 0)
    transport_count = sent_ships.get("transport", 0)
    fighter_count = sent_ships.get("fighter", 0)

    if roll <= 30:
        return {
            "outcome": "empty",
            "metal_found": 0,
            "crystal_found": 0,
            "lost_ships": {},
            "returned_ships": dict(sent_ships),
            "description": "Экспедиция ничего не обнаружила.",
        }

    if roll <= 55:
        metal_found = 80 * total_ships + 40 * scout_count + 120 * transport_count
        return {
            "outcome": "metal",
            "metal_found": metal_found,
            "crystal_found": 0,
            "lost_ships": {},
            "returned_ships": dict(sent_ships),
            "description": f"Экспедиция обнаружила залежи металла: {metal_found}.",
        }

    if roll <= 80:
        crystal_found = 60 * total_ships + 30 * scout_count + 90 * transport_count
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