MAX_SECTOR_RADIUS = 5


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