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
    chances = {
        "empty": 24,
        "metal": 22,
        "crystal": 20,
        "rare_find": 6,
        "pirates": 10,
        "anomaly": 8,
        "ship_damage": 5,
        "loss": 5,
    }

    risk_reduction = min(15, recon_level * 2 + combat_power // 12)

    removed_risk = 0
    removed_risk += _reduce_chance(
        chances=chances,
        key="pirates",
        amount=risk_reduction,
        minimum=4,
    )
    removed_risk += _reduce_chance(
        chances=chances,
        key="anomaly",
        amount=max(0, risk_reduction - removed_risk),
        minimum=3,
    )
    removed_risk += _reduce_chance(
        chances=chances,
        key="ship_damage",
        amount=max(0, risk_reduction - removed_risk),
        minimum=2,
    )
    removed_risk += _reduce_chance(
        chances=chances,
        key="loss",
        amount=max(0, risk_reduction - removed_risk),
        minimum=2,
    )

    chances["metal"] += removed_risk // 3
    chances["crystal"] += removed_risk // 3
    chances["rare_find"] += removed_risk - 2 * (removed_risk // 3)

    return chances


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
    outcome = _roll_weighted_outcome(chances)

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

    context = {
        "sent_ships": sent_ships,
        "cargo_capacity": cargo_capacity,
        "attack_power": attack_power,
        "defense_power": defense_power,
        "combat_power": combat_power,
        "cargo_level": cargo_level,
        "transport_count": transport_count,
        "heavy_transport_count": heavy_transport_count,
        "fighter_count": fighter_count,
        "corvette_count": corvette_count,
        "total_ships": total_ships,
    }

    if outcome == "empty":
        return _build_expedition_result(
            outcome="empty",
            metal_found=0,
            crystal_found=0,
            sent_ships=sent_ships,
            lost_ships={},
            description=(
                "\u042d\u043a\u0441\u043f\u0435\u0434\u0438\u0446\u0438\u044f "
                "\u043d\u0435 \u043e\u0431\u043d\u0430\u0440\u0443\u0436\u0438\u043b\u0430 "
                "\u043d\u0438\u0447\u0435\u0433\u043e \u0446\u0435\u043d\u043d\u043e\u0433\u043e."
            ),
            cargo_capacity=cargo_capacity,
            attack_power=attack_power,
            defense_power=defense_power,
        )

    if outcome == "metal":
        metal_found = _calculate_metal_reward(context)

        return _build_expedition_result(
            outcome="metal",
            metal_found=metal_found,
            crystal_found=0,
            sent_ships=sent_ships,
            lost_ships={},
            description=(
                "\u042d\u043a\u0441\u043f\u0435\u0434\u0438\u0446\u0438\u044f "
                "\u043e\u0431\u043d\u0430\u0440\u0443\u0436\u0438\u043b\u0430 "
                "\u0437\u0430\u043b\u0435\u0436\u0438 \u043c\u0435\u0442\u0430\u043b\u043b\u0430: "
                f"{metal_found}."
            ),
            cargo_capacity=cargo_capacity,
            attack_power=attack_power,
            defense_power=defense_power,
        )

    if outcome == "crystal":
        crystal_found = _calculate_crystal_reward(context)

        return _build_expedition_result(
            outcome="crystal",
            metal_found=0,
            crystal_found=crystal_found,
            sent_ships=sent_ships,
            lost_ships={},
            description=(
                "\u042d\u043a\u0441\u043f\u0435\u0434\u0438\u0446\u0438\u044f "
                "\u043e\u0431\u043d\u0430\u0440\u0443\u0436\u0438\u043b\u0430 "
                "\u043a\u0440\u0438\u0441\u0442\u0430\u043b\u043b\u044b: "
                f"{crystal_found}."
            ),
            cargo_capacity=cargo_capacity,
            attack_power=attack_power,
            defense_power=defense_power,
        )

    if outcome == "rare_find":
        reward = _calculate_rare_find_reward(context)

        return _build_expedition_result(
            outcome="rare_find",
            metal_found=reward["metal"],
            crystal_found=reward["crystal"],
            sent_ships=sent_ships,
            lost_ships={},
            description=(
                "\u042d\u043a\u0441\u043f\u0435\u0434\u0438\u0446\u0438\u044f "
                "\u043d\u0430\u0448\u043b\u0430 \u0440\u0435\u0434\u043a\u0438\u0439 "
                "\u043e\u0431\u043b\u043e\u043c\u043e\u043a \u0434\u0440\u0435\u0432\u043d\u0435\u0433\u043e "
                "\u043a\u043e\u0440\u0430\u0431\u043b\u044f. "
                "\u0413\u0440\u0443\u0437\u043e\u0432\u044b\u0435 \u043e\u0442\u0441\u0435\u043a\u0438 "
                "\u0437\u0430\u043f\u043e\u043b\u043d\u0435\u043d\u044b "
                "\u0446\u0435\u043d\u043d\u044b\u043c\u0438 \u0440\u0435\u0441\u0443\u0440\u0441\u0430\u043c\u0438."
            ),
            cargo_capacity=cargo_capacity,
            attack_power=attack_power,
            defense_power=defense_power,
        )

    if outcome == "pirates":
        lost_ships = _calculate_pirate_losses(context)
        reward = _calculate_pirate_salvage(context, lost_ships)

        return _build_expedition_result(
            outcome="pirates",
            metal_found=reward["metal"],
            crystal_found=reward["crystal"],
            sent_ships=sent_ships,
            lost_ships=lost_ships,
            description=(
                "\u042d\u043a\u0441\u043f\u0435\u0434\u0438\u0446\u0438\u044f "
                "\u0441\u0442\u043e\u043b\u043a\u043d\u0443\u043b\u0430\u0441\u044c "
                "\u0441 \u043f\u0438\u0440\u0430\u0442\u0441\u043a\u0438\u043c "
                "\u043f\u0430\u0442\u0440\u0443\u043b\u0451\u043c. "
                "\u042d\u0441\u043a\u043e\u0440\u0442 \u0441\u0443\u043c\u0435\u043b "
                "\u043e\u0442\u0431\u0438\u0442\u044c \u0430\u0442\u0430\u043a\u0443 "
                "\u0438 \u0441\u043e\u0431\u0440\u0430\u0442\u044c \u0447\u0430\u0441\u0442\u044c "
                "\u0442\u0440\u043e\u0444\u0435\u0435\u0432."
            ),
            cargo_capacity=cargo_capacity,
            attack_power=attack_power,
            defense_power=defense_power,
        )

    if outcome == "anomaly":
        lost_ships = _calculate_anomaly_losses(context)
        reward = _calculate_anomaly_reward(context)

        return _build_expedition_result(
            outcome="anomaly",
            metal_found=reward["metal"],
            crystal_found=reward["crystal"],
            sent_ships=sent_ships,
            lost_ships=lost_ships,
            description=(
                "\u042d\u043a\u0441\u043f\u0435\u0434\u0438\u0446\u0438\u044f "
                "\u043f\u0440\u043e\u0448\u043b\u0430 \u0447\u0435\u0440\u0435\u0437 "
                "\u043d\u0435\u0441\u0442\u0430\u0431\u0438\u043b\u044c\u043d\u0443\u044e "
                "\u0430\u043d\u043e\u043c\u0430\u043b\u0438\u044e. "
                "\u0427\u0430\u0441\u0442\u044c \u0444\u043b\u043e\u0442\u0430 "
                "\u043f\u043e\u0441\u0442\u0440\u0430\u0434\u0430\u043b\u0430, "
                "\u043d\u043e \u0441\u0435\u043d\u0441\u043e\u0440\u044b "
                "\u043e\u0431\u043d\u0430\u0440\u0443\u0436\u0438\u043b\u0438 "
                "\u0446\u0435\u043d\u043d\u044b\u0435 \u0444\u0440\u0430\u0433\u043c\u0435\u043d\u0442\u044b."
            ),
            cargo_capacity=cargo_capacity,
            attack_power=attack_power,
            defense_power=defense_power,
        )

    if outcome == "ship_damage":
        lost_ships = _calculate_ship_damage_losses(context)

        return _build_expedition_result(
            outcome="ship_damage",
            metal_found=0,
            crystal_found=0,
            sent_ships=sent_ships,
            lost_ships=lost_ships,
            description=(
                "\u042d\u043a\u0441\u043f\u0435\u0434\u0438\u0446\u0438\u044f "
                "\u0432\u0435\u0440\u043d\u0443\u043b\u0430\u0441\u044c "
                "\u0441 \u0442\u044f\u0436\u0451\u043b\u044b\u043c\u0438 "
                "\u043f\u043e\u0432\u0440\u0435\u0436\u0434\u0435\u043d\u0438\u044f\u043c\u0438. "
                "\u0427\u0430\u0441\u0442\u044c \u043a\u043e\u0440\u0430\u0431\u043b\u0435\u0439 "
                "\u043d\u0435 \u0441\u043c\u043e\u0433\u043b\u0430 "
                "\u0434\u043e\u0431\u0440\u0430\u0442\u044c\u0441\u044f "
                "\u0434\u043e \u0431\u0430\u0437\u044b."
            ),
            cargo_capacity=cargo_capacity,
            attack_power=attack_power,
            defense_power=defense_power,
        )

    lost_ships = _calculate_major_losses(context)

    return _build_expedition_result(
        outcome="loss",
        metal_found=0,
        crystal_found=0,
        sent_ships=sent_ships,
        lost_ships=lost_ships,
        description=(
            "\u042d\u043a\u0441\u043f\u0435\u0434\u0438\u0446\u0438\u044f "
            "\u043f\u043e\u043f\u0430\u043b\u0430 \u0432 "
            "\u043e\u043f\u0430\u0441\u043d\u0443\u044e \u0437\u043e\u043d\u0443 "
            "\u0438 \u043f\u043e\u043d\u0435\u0441\u043b\u0430 "
            "\u0441\u0435\u0440\u044c\u0451\u0437\u043d\u044b\u0435 "
            "\u043f\u043e\u0442\u0435\u0440\u0438."
        ),
        cargo_capacity=cargo_capacity,
        attack_power=attack_power,
        defense_power=defense_power,
    )


def _calculate_metal_reward(
    context: dict,
) -> int:
    base_metal = (
        40 * context["total_ships"]
        + 160 * context["transport_count"]
        + 720 * context["heavy_transport_count"]
        + 35 * context["fighter_count"]
        + 90 * context["corvette_count"]
    )

    return min(
        context["cargo_capacity"],
        int(base_metal * cargo_multiplier(context["cargo_level"])),
    )


def _calculate_crystal_reward(
    context: dict,
) -> int:
    base_crystal = (
        30 * context["total_ships"]
        + 120 * context["transport_count"]
        + 540 * context["heavy_transport_count"]
        + 25 * context["fighter_count"]
        + 70 * context["corvette_count"]
    )

    return min(
        context["cargo_capacity"],
        int(base_crystal * cargo_multiplier(context["cargo_level"])),
    )


def _calculate_rare_find_reward(
    context: dict,
) -> dict[str, int]:
    base_reward = (
        120 * context["total_ships"]
        + 420 * context["transport_count"]
        + 1600 * context["heavy_transport_count"]
        + 90 * context["fighter_count"]
        + 220 * context["corvette_count"]
    )
    total_reward = min(
        context["cargo_capacity"],
        int(base_reward * cargo_multiplier(context["cargo_level"])),
    )

    metal = int(total_reward * 0.6)
    crystal = total_reward - metal

    return {
        "metal": metal,
        "crystal": crystal,
    }


def _calculate_pirate_salvage(
    context: dict,
    lost_ships: dict[str, int],
) -> dict[str, int]:
    lost_count = sum(lost_ships.values())
    escort_bonus = min(400, context["combat_power"] * 8)
    base_reward = 120 + escort_bonus - lost_count * 60
    total_reward = min(context["cargo_capacity"], max(0, base_reward))

    metal = int(total_reward * 0.7)
    crystal = total_reward - metal

    return {
        "metal": metal,
        "crystal": crystal,
    }


def _calculate_anomaly_reward(
    context: dict,
) -> dict[str, int]:
    base_reward = 80 + context["defense_power"] * 5
    total_reward = min(context["cargo_capacity"], max(0, base_reward))

    metal = int(total_reward * 0.35)
    crystal = total_reward - metal

    return {
        "metal": metal,
        "crystal": crystal,
    }


def _calculate_pirate_losses(
    context: dict,
) -> dict[str, int]:
    combat_power = context["combat_power"]

    lost_transport = 1 if context["transport_count"] > 0 and combat_power < 18 else 0
    lost_heavy_transport = (
        1 if context["heavy_transport_count"] > 0 and combat_power < 30 else 0
    )
    lost_fighter = 1 if context["fighter_count"] > 0 and combat_power < 45 else 0
    lost_corvette = 1 if context["corvette_count"] > 0 and combat_power < 60 else 0

    return _normalize_lost_ships(
        {
            "transport": lost_transport,
            "heavy_transport": lost_heavy_transport,
            "fighter": lost_fighter,
            "corvette": lost_corvette,
        },
        context["sent_ships"],
    )


def _calculate_anomaly_losses(
    context: dict,
) -> dict[str, int]:
    defense_power = context["defense_power"]

    lost_transport = 1 if context["transport_count"] > 0 and defense_power < 12 else 0
    lost_heavy_transport = (
        1 if context["heavy_transport_count"] > 0 and defense_power < 24 else 0
    )
    lost_fighter = 1 if context["fighter_count"] > 0 and defense_power < 18 else 0
    lost_corvette = 1 if context["corvette_count"] > 0 and defense_power < 36 else 0

    return _normalize_lost_ships(
        {
            "transport": lost_transport,
            "heavy_transport": lost_heavy_transport,
            "fighter": lost_fighter,
            "corvette": lost_corvette,
        },
        context["sent_ships"],
    )


def _calculate_ship_damage_losses(
    context: dict,
) -> dict[str, int]:
    combat_power = context["combat_power"]

    lost_transport = 1 if context["transport_count"] > 0 and combat_power < 24 else 0
    lost_heavy_transport = (
        1 if context["heavy_transport_count"] > 0 and combat_power < 40 else 0
    )
    lost_fighter = 1 if context["fighter_count"] > 0 else 0
    lost_corvette = 1 if context["corvette_count"] > 0 and combat_power < 55 else 0

    return _normalize_lost_ships(
        {
            "transport": lost_transport,
            "heavy_transport": lost_heavy_transport,
            "fighter": lost_fighter,
            "corvette": lost_corvette,
        },
        context["sent_ships"],
    )


def _calculate_major_losses(
    context: dict,
) -> dict[str, int]:
    combat_power = context["combat_power"]

    lost_transport = 1 if context["transport_count"] > 0 and combat_power < 16 else 0
    lost_heavy_transport = (
        1 if context["heavy_transport_count"] > 0 and combat_power < 28 else 0
    )
    lost_fighter = 1 if context["fighter_count"] > 0 else 0
    lost_corvette = 1 if context["corvette_count"] > 0 and combat_power < 44 else 0

    return _normalize_lost_ships(
        {
            "transport": lost_transport,
            "heavy_transport": lost_heavy_transport,
            "fighter": lost_fighter,
            "corvette": lost_corvette,
        },
        context["sent_ships"],
    )


def _build_expedition_result(
    outcome: str,
    metal_found: int,
    crystal_found: int,
    sent_ships: dict[str, int],
    lost_ships: dict[str, int],
    description: str,
    cargo_capacity: int,
    attack_power: int,
    defense_power: int,
) -> dict:
    normalized_lost_ships = _normalize_lost_ships(lost_ships, sent_ships)
    returned_ships = _calculate_returned_ships(sent_ships, normalized_lost_ships)

    return {
        "outcome": outcome,
        "event_code": _expedition_event_code(outcome),
        "event_title": _expedition_event_title(outcome),
        "severity": _expedition_event_severity(
            outcome=outcome,
            lost_ships=normalized_lost_ships,
            metal_found=metal_found,
            crystal_found=crystal_found,
        ),
        "metal_found": metal_found,
        "crystal_found": crystal_found,
        "lost_ships": normalized_lost_ships,
        "returned_ships": returned_ships,
        "description": description,
        "cargo_capacity": cargo_capacity,
        "attack_power": attack_power,
        "defense_power": defense_power,
    }
def _expedition_event_code(
    outcome: str,
) -> str:
    if outcome.strip() == "":
        return "unknown"

    return outcome


def _expedition_event_title(
    outcome: str,
) -> str:
    if outcome == "empty":
        return "\u041f\u0443\u0441\u0442\u043e\u0439 \u0441\u0435\u043a\u0442\u043e\u0440"

    if outcome == "metal":
        return "\u041c\u0435\u0442\u0430\u043b\u043b\u0438\u0447\u0435\u0441\u043a\u043e\u0435 \u043c\u0435\u0441\u0442\u043e\u0440\u043e\u0436\u0434\u0435\u043d\u0438\u0435"

    if outcome == "crystal":
        return "\u041a\u0440\u0438\u0441\u0442\u0430\u043b\u043b\u0438\u0447\u0435\u0441\u043a\u043e\u0435 \u043f\u043e\u043b\u0435"

    if outcome == "rare_find":
        return "\u0420\u0435\u0434\u043a\u0430\u044f \u043d\u0430\u0445\u043e\u0434\u043a\u0430"

    if outcome == "pirates":
        return "\u041f\u0438\u0440\u0430\u0442\u0441\u043a\u0438\u0439 \u043f\u0430\u0442\u0440\u0443\u043b\u044c"

    if outcome == "anomaly":
        return "\u041d\u0435\u0441\u0442\u0430\u0431\u0438\u043b\u044c\u043d\u0430\u044f \u0430\u043d\u043e\u043c\u0430\u043b\u0438\u044f"

    if outcome == "ship_damage":
        return "\u041f\u043e\u0432\u0440\u0435\u0436\u0434\u0435\u043d\u0438\u0435 \u043a\u043e\u0440\u0430\u0431\u043b\u0435\u0439"

    if outcome == "loss":
        return "\u0422\u044f\u0436\u0451\u043b\u044b\u0435 \u043f\u043e\u0442\u0435\u0440\u0438"

    return "\u041d\u0435\u0438\u0437\u0432\u0435\u0441\u0442\u043d\u044b\u0439 \u0438\u0442\u043e\u0433"


def _expedition_event_severity(
    outcome: str,
    lost_ships: dict[str, int] | None = None,
    metal_found: int = 0,
    crystal_found: int = 0,
) -> str:
    lost_count = sum((lost_ships or {}).values())
    reward_total = metal_found + crystal_found

    if outcome == "rare_find":
        return "bonus"

    if outcome in ("empty", "metal", "crystal"):
        return "low"

    if outcome == "pirates":
        if lost_count >= 2:
            return "high"

        if lost_count == 1:
            return "medium"

        if reward_total > 0:
            return "low"

        return "medium"

    if outcome == "anomaly":
        if lost_count >= 2:
            return "high"

        if lost_count == 1:
            return "medium"

        if reward_total > 0:
            return "low"

        return "medium"

    if outcome == "ship_damage":
        if lost_count >= 2:
            return "high"

        if lost_count == 1:
            return "medium"

        return "low"

    if outcome == "loss":
        if lost_count >= 2:
            return "critical"

        if lost_count == 1:
            return "high"

        return "medium"

    return "unknown"


def _calculate_returned_ships(
    sent_ships: dict[str, int],
    lost_ships: dict[str, int],
) -> dict[str, int]:
    returned_ships = {}

    for ship_code in EXPEDITION_SHIP_CODES:
        sent_count = max(0, sent_ships.get(ship_code, 0))
        lost_count = max(0, lost_ships.get(ship_code, 0))

        returned_ships[ship_code] = max(0, sent_count - lost_count)

    return returned_ships


def _normalize_lost_ships(
    lost_ships: dict[str, int],
    sent_ships: dict[str, int],
) -> dict[str, int]:
    normalized_lost_ships = {}

    for ship_code in EXPEDITION_SHIP_CODES:
        sent_count = max(0, sent_ships.get(ship_code, 0))
        lost_count = max(0, lost_ships.get(ship_code, 0))

        normalized_lost_ships[ship_code] = min(sent_count, lost_count)

    return normalized_lost_ships


def _reduce_chance(
    chances: dict[str, int],
    key: str,
    amount: int,
    minimum: int,
) -> int:
    current = chances[key]
    reduced_by = min(max(0, amount), max(0, current - minimum))

    chances[key] = current - reduced_by

    return reduced_by


def _roll_weighted_outcome(
    chances: dict[str, int],
) -> str:
    roll = _roll_percent()
    border = 0

    for outcome, chance in chances.items():
        border += chance

        if roll <= border:
            return outcome

    return "empty"


def _roll_percent() -> int:
    import random

    return random.randint(1, 100)