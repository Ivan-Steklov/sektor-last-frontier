from app.galaxy.rules import (
    build_scout_report,
    normalize_sector_radius,
    scout_discovered_signals,
    scout_duration_seconds,
    sector_system_numbers,
    system_danger_label,
    system_danger_level,
    system_display_name,
    system_richness,
)


def test_normalize_sector_radius() -> None:
    assert normalize_sector_radius(-10) == 1
    assert normalize_sector_radius(0) == 1
    assert normalize_sector_radius(3) == 3
    assert normalize_sector_radius(10) == 5


def test_sector_system_numbers_never_go_below_one() -> None:
    assert sector_system_numbers(center_system=1, radius=3) == [1, 2, 3, 4]


def test_sector_system_numbers_around_center() -> None:
    assert sector_system_numbers(center_system=10, radius=2) == [
        8,
        9,
        10,
        11,
        12,
    ]


def test_system_display_name() -> None:
    assert system_display_name(galaxy=1, system=7) == "Система 1-7"


def test_system_richness_returns_known_label() -> None:
    assert system_richness(galaxy=1, system=1) in {
        "бедная",
        "обычная",
        "богатая",
    }


def test_system_danger_level_and_label() -> None:
    danger_level = system_danger_level(galaxy=1, system=1)

    assert danger_level in {1, 2, 3}
    assert system_danger_label(danger_level) in {
        "низкая",
        "средняя",
        "высокая",
    }


def test_scout_duration_depends_on_distance() -> None:
    assert scout_duration_seconds(1) == 60
    assert scout_duration_seconds(2) == 75
    assert scout_duration_seconds(20) == 180


def test_scout_discovered_signals_range() -> None:
    for system in range(1, 20):
        signals = scout_discovered_signals(galaxy=1, system=system)
        assert signals in {1, 2, 3, 4}


def test_build_scout_report_shape() -> None:
    report = build_scout_report(
        target_galaxy=1,
        target_system=3,
    )

    assert report["target_galaxy"] == 1
    assert report["target_system"] == 3
    assert report["richness"] in {"бедная", "обычная", "богатая"}
    assert report["danger"] in {"низкая", "средняя", "высокая"}
    assert report["danger_level"] in {1, 2, 3}
    assert report["discovered_signals"] in {1, 2, 3, 4}
    assert report["description"] != ""