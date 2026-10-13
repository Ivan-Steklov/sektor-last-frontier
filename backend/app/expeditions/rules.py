from app.ships.catalog import SHIPS_BY_CODE


EXPEDITION_SHIP_CODES = (
    "transport",
    "heavy_transport",
    "fighter",
    "corvette",
)


def expedition_duration_seconds(
    engines_level: int,
) -> int:
    base_seconds = 600
    reduction_percent = engines_level * 5

    adjusted_seconds = int(base_seconds * (1 - reduction_percent / 100))

    return max(300, adjusted_seconds)


def expedition_cargo_capacity(
    sent_ships: dict[str, int],
) -> int:
    total = 0

    for ship_code in EXPEDITION_SHIP_CODES:
        quantity = sent_ships.get(ship_code, 0)
        ship_definition = SHIPS_BY_CODE.get(ship_code)

        if ship_definition is None or quantity <= 0:
            continue

        total += quantity * ship_definition.cargo_capacity

    return total


def expedition_attack_power(
    sent_ships: dict[str, int],
) -> int:
    total = 0

    for ship_code in EXPEDITION_SHIP_CODES:
        quantity = sent_ships.get(ship_code, 0)
        ship_definition = SHIPS_BY_CODE.get(ship_code)

        if ship_definition is None or quantity <= 0:
            continue

        total += quantity * ship_definition.attack

    return total


def expedition_defense_power(
    sent_ships: dict[str, int],
) -> int:
    total = 0

    for ship_code in EXPEDITION_SHIP_CODES:
        quantity = sent_ships.get(ship_code, 0)
        ship_definition = SHIPS_BY_CODE.get(ship_code)

        if ship_definition is None or quantity <= 0:
            continue

        total += quantity * ship_definition.defense

    return total


def expedition_outcome_chances(
    recon_level: int,
    combat_power: int,
) -> dict[str, int]:
    empty_chance = 30
    metal_chance = 25
    crystal_chance = 25
    loss_chance = 20

    # Разведка немного снижает шанс плохого исхода.
    # Боевой эскорт тоже снижает риск, но с ограничением.
    recon_reduction = recon_level * 2
    escort_reduction = combat_power // 12
    reduction = min(loss_chance - 5, recon_reduction + escort_reduction)

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
    cargo_capacity = expedition_cargo_capacity(sent_ships)
    attack_power = expedition_attack_power(sent_ships)
    defense_power = expedition_defense_power(sent_ships)
    combat_power = attack_power + defense_power

    chances = expedition_outcome_chances(
        recon_level=recon_level,
        combat_power=combat_power,
    )
    roll = _roll_percent()

    transport_count = sent_ships.get("transport", 0)
    heavy_transport_count = sent_ships.get("heavy_transport", 0)
    fighter_count = sent_ships.get("fighter", 0)
    corvette_count = sent_ships.get("corvette", 0)

    total_ships = (
        transport_count
        + heavy_transport_count
        + fighter_count
        + corvette_count
    )

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
            "description": "Экспедиция не обнаружила ничего ценного.",
            "cargo_capacity": cargo_capacity,
            "attack_power": attack_power,
            "defense_power": defense_power,
        }

    if roll <= metal_border:
        base_metal = (
            40 * total_ships
            + 160 * transport_count
            + 720 * heavy_transport_count
            + 35 * fighter_count
            + 90 * corvette_count
        )
        metal_found = min(
            cargo_capacity,
            int(base_metal * cargo_multiplier(cargo_level)),
        )

        return {
            "outcome": "metal",
            "metal_found": metal_found,
            "crystal_found": 0,
            "lost_ships": {},
            "returned_ships": dict(sent_ships),
            "description": f"Экспедиция обнаружила залежи металла: {metal_found}.",
            "cargo_capacity": cargo_capacity,
            "attack_power": attack_power,
            "defense_power": defense_power,
        }

    if roll <= crystal_border:
        base_crystal = (
            30 * total_ships
            + 120 * transport_count
            + 540 * heavy_transport_count
            + 25 * fighter_count
            + 70 * corvette_count
        )
        crystal_found = min(
            cargo_capacity,
            int(base_crystal * cargo_multiplier(cargo_level)),
        )

        return {
            "outcome": "crystal",
            "metal_found": 0,
            "crystal_found": crystal_found,
            "lost_ships": {},
            "returned_ships": dict(sent_ships),
            "description": f"Экспедиция обнаружила кристаллы: {crystal_found}.",
            "cargo_capacity": cargo_capacity,
            "attack_power": attack_power,
            "defense_power": defense_power,
        }

    # Плохой исход. Эскорт снижает риск самого события выше,
    # но если событие уже случилось, часть флота может быть потеряна.
    lost_transport = min(
        transport_count,
        1 if transport_count > 0 and combat_power < 12 else 0,
    )
    lost_heavy_transport = min(
        heavy_transport_count,
        1 if heavy_transport_count > 0 and combat_power < 24 else 0,
    )
    lost_fighter = min(
        fighter_count,
        1 if fighter_count > 0 else 0,
    )
    lost_corvette = min(
        corvette_count,
        1 if corvette_count > 0 and combat_power < 36 else 0,
    )

    lost_ships = {
        "transport": lost_transport,
        "heavy_transport": lost_heavy_transport,
        "fighter": lost_fighter,
        "corvette": lost_corvette,
    }
    returned_ships = {
        "transport": transport_count - lost_transport,
        "heavy_transport": heavy_transport_count - lost_heavy_transport,
        "fighter": fighter_count - lost_fighter,
        "corvette": corvette_count - lost_corvette,
    }

    return {
        "outcome": "loss",
        "metal_found": 0,
        "crystal_found": 0,
        "lost_ships": lost_ships,
        "returned_ships": returned_ships,
        "description": "Экспедиция попала в опасную аномалию и понесла потери.",
        "cargo_capacity": cargo_capacity,
        "attack_power": attack_power,
        "defense_power": defense_power,
    }


def _roll_percent() -> int:
    import random

    return random.randint(1, 100)