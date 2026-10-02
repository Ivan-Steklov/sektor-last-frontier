from datetime import datetime

from pydantic import BaseModel, Field


class GalaxyPlanetMarker(BaseModel):
    name: str
    position: int
    owner_name: str | None
    is_home_planet: bool


class StartGalaxyScoutRequest(BaseModel):
    target_galaxy: int = Field(ge=1)
    target_system: int = Field(ge=1)


class StartGalaxyResourceMissionRequest(BaseModel):
    target_galaxy: int = Field(ge=1)
    target_system: int = Field(ge=1)


class GalaxyScoutMissionResponse(BaseModel):
    id: int
    target_galaxy: int
    target_system: int
    started_at: datetime
    finishes_at: datetime
    remaining_seconds: int


class GalaxyResourceMissionResponse(BaseModel):
    id: int
    target_galaxy: int
    target_system: int
    started_at: datetime
    finishes_at: datetime
    remaining_seconds: int


class GalaxyScoutReportResponse(BaseModel):
    target_galaxy: int
    target_system: int
    richness: str
    danger: str
    danger_level: int
    discovered_signals: int
    description: str
    completed_at: datetime


class GalaxyResourceMissionResultResponse(BaseModel):
    target_galaxy: int
    target_system: int
    metal_found: int
    crystal_found: int
    danger: str
    danger_level: int
    transport_lost: bool = False
    cargo_loss_percent: int = 0
    description: str
    completed_at: datetime


class GalaxySystemItem(BaseModel):
    galaxy: int
    system: int
    name: str
    distance: int
    richness: str
    danger: str
    danger_level: int
    has_home_planet: bool
    is_scouted: bool
    scout_report: GalaxyScoutReportResponse | None
    planets: list[GalaxyPlanetMarker]


class GalaxySectorResponse(BaseModel):
    current_galaxy: int
    current_system: int
    current_position: int
    systems: list[GalaxySystemItem]


class GalaxyScoutStateResponse(BaseModel):
    active_mission: GalaxyScoutMissionResponse | None
    last_report: GalaxyScoutReportResponse | None


class GalaxyResourceMissionStateResponse(BaseModel):
    active_mission: GalaxyResourceMissionResponse | None
    last_result: GalaxyResourceMissionResultResponse | None