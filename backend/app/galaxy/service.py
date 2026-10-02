from sqlalchemy.orm import Session

from app.galaxy.rules import (
    sector_system_numbers,
    system_danger_label,
    system_danger_level,
    system_display_name,
    system_richness,
)
from app.galaxy.schemas import (
    GalaxyPlanetMarker,
    GalaxySectorResponse,
    GalaxySystemItem,
)
from app.planets.service import get_or_create_home_planet


def get_galaxy_sector(
    db: Session,
    telegram_id: int,
    radius: int = 3,
) -> GalaxySectorResponse:
    home_planet = get_or_create_home_planet(
        db=db,
        telegram_id=telegram_id,
    )

    systems: list[GalaxySystemItem] = []

    for system_number in sector_system_numbers(
        center_system=home_planet.system,
        radius=radius,
    ):
        is_home_system = system_number == home_planet.system
        danger_level = system_danger_level(
            galaxy=home_planet.galaxy,
            system=system_number,
        )

        planets: list[GalaxyPlanetMarker] = []

        if is_home_system:
            planets.append(
                GalaxyPlanetMarker(
                    name=home_planet.name,
                    position=home_planet.position,
                    owner_name=home_planet.username,
                    is_home_planet=True,
                )
            )

        systems.append(
            GalaxySystemItem(
                galaxy=home_planet.galaxy,
                system=system_number,
                name=system_display_name(
                    galaxy=home_planet.galaxy,
                    system=system_number,
                ),
                distance=abs(system_number - home_planet.system),
                richness=system_richness(
                    galaxy=home_planet.galaxy,
                    system=system_number,
                ),
                danger=system_danger_label(danger_level),
                danger_level=danger_level,
                has_home_planet=is_home_system,
                planets=planets,
            )
        )

    return GalaxySectorResponse(
        current_galaxy=home_planet.galaxy,
        current_system=home_planet.system,
        current_position=home_planet.position,
        systems=systems,
    )