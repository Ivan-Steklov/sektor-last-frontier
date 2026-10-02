from app.galaxy.service import get_galaxy_sector


def test_galaxy_sector_contains_home_planet(db_session) -> None:
    sector = get_galaxy_sector(
        db=db_session,
        telegram_id=1,
        radius=3,
    )

    assert sector.current_galaxy >= 1
    assert sector.current_system >= 1
    assert sector.current_position >= 1
    assert len(sector.systems) > 0

    home_systems = [
        system for system in sector.systems if system.has_home_planet
    ]

    assert len(home_systems) == 1

    home_system = home_systems[0]

    assert home_system.system == sector.current_system
    assert len(home_system.planets) == 1
    assert home_system.planets[0].is_home_planet is True


def test_galaxy_sector_respects_radius(db_session) -> None:
    sector = get_galaxy_sector(
        db=db_session,
        telegram_id=2,
        radius=2,
    )

    for system in sector.systems:
        assert system.distance <= 2