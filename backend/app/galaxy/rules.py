MAX_SECTOR_RADIUS = 5
MAX_SCOUT_DISTANCE = 5


def normalize_sector_radius(radius: int) -> int:
    if radius < 1:
        return 1

    if radius > MAX_SECTOR_RADIUS:
        return MAX_SECTOR_RADIUS

    return radius


def sector_system_numbers(
    center_system: int,
    radius: int,
) -> list[int]:
    normalized_radius = normalize_sector_radius(radius)

    start = max(1, center_system - normalized_radius)
    end = center_system + normalized_radius

    return list(range(start, end + 1))


def system_display_name(
    galaxy: int,
    system: int,
) -> str:
    return f"Система {galaxy}-{system}"


def system_richness(
    galaxy: int,
    system: int,
) -> str:
    value = (galaxy * 31 + system * 17) % 100

    if value >= 75:
        return "богатая"

    if value >= 35:
        return "обычная"

    return "бедная"


def system_danger_level(
    galaxy: int,
    system: int,
) -> int:
    value = (galaxy * 13 + system * 29) % 100

    if value >= 80:
        return 3

    if value >= 45:
        return 2

    return 1


def system_danger_label(
    danger_level: int,
) -> str:
    if danger_level >= 3:
        return "высокая"

    if danger_level == 2:
        return "средняя"

    return "низкая"


def scout_duration_seconds(
    distance: int,
) -> int:
    safe_distance = max(1, distance)

    return min(180, 45 + safe_distance * 15)


def scout_discovered_signals(
    galaxy: int,
    system: int,
) -> int:
    return ((galaxy * 19 + system * 23) % 4) + 1


def build_scout_report(
    target_galaxy: int,
    target_system: int,
) -> dict:
    danger_level = system_danger_level(
        galaxy=target_galaxy,
        system=target_system,
    )
    richness = system_richness(
        galaxy=target_galaxy,
        system=target_system,
    )
    danger = system_danger_label(danger_level)
    discovered_signals = scout_discovered_signals(
        galaxy=target_galaxy,
        system=target_system,
    )

    if danger_level >= 3:
        description = (
            f"Разведка системы {target_galaxy}:{target_system} обнаружила "
            "нестабильные сигналы и повышенную активность неизвестных объектов."
        )
    elif richness == "богатая":
        description = (
            f"Разведка системы {target_galaxy}:{target_system} обнаружила "
            "перспективные ресурсные зоны."
        )
    else:
        description = (
            f"Разведка системы {target_galaxy}:{target_system} завершена. "
            "Получены базовые навигационные данные."
        )

    return {
        "target_galaxy": target_galaxy,
        "target_system": target_system,
        "richness": richness,
        "danger": danger,
        "danger_level": danger_level,
        "discovered_signals": discovered_signals,
        "description": description,
    }