from pydantic import BaseModel


class GalaxyPlanetMarker(BaseModel):
    name: str
    position: int
    owner_name: str | None
    is_home_planet: bool


class GalaxySystemItem(BaseModel):
    galaxy: int
    system: int
    name: str
    distance: int
    richness: str
    danger: str
    danger_level: int
    has_home_planet: bool
    planets: list[GalaxyPlanetMarker]


class GalaxySectorResponse(BaseModel):
    current_galaxy: int
    current_system: int
    current_position: int
    systems: list[GalaxySystemItem]