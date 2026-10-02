from __future__ import annotations

from datetime import datetime, timezone

from pydantic import BaseModel, ConfigDict, Field, field_serializer


def serialize_datetime(value: datetime | None) -> str | None:
    if value is None:
        return None

    if value.tzinfo is None:
        value = value.replace(tzinfo=timezone.utc)

    return value.isoformat()


class StartGalaxyScoutRequest(BaseModel):
    target_galaxy: int
    target_system: int


class StartGalaxyResourceMissionRequest(BaseModel):
    target_galaxy: int
    target_system: int


class GalaxyPlanetMarker(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    name: str
    position: int
    owner_name: str | None = None
    is_home_planet: bool


class GalaxyScoutReportResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    target_galaxy: int
    target_system: int
    richness: str
    danger: str
    danger_level: int
    discovered_signals: int
    description: str
    completed_at: datetime | None = None

    @field_serializer("completed_at")
    def serialize_completed_at(self, value: datetime | None) -> str | None:
        return serialize_datetime(value)


class GalaxySystemItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    galaxy: int
    system: int
    name: str
    distance: int
    richness: str
    danger: str
    danger_level: int
    has_home_planet: bool
    is_scouted: bool
    scout_report: GalaxyScoutReportResponse | None = None
    planets: list[GalaxyPlanetMarker] = Field(default_factory=list)


class GalaxySectorResponse(BaseModel):
    current_galaxy: int
    current_system: int
    current_position: int
    systems: list[GalaxySystemItem]


class GalaxyScoutMissionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    target_galaxy: int
    target_system: int
    started_at: datetime | None = None
    finishes_at: datetime | None = None
    remaining_seconds: int

    @field_serializer("started_at", "finishes_at")
    def serialize_mission_datetime(self, value: datetime | None) -> str | None:
        return serialize_datetime(value)


class GalaxyScoutStateResponse(BaseModel):
    active_mission: GalaxyScoutMissionResponse | None = None
    last_report: GalaxyScoutReportResponse | None = None


class GalaxyResourceMissionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    target_galaxy: int
    target_system: int
    started_at: datetime | None = None
    finishes_at: datetime | None = None
    remaining_seconds: int

    @field_serializer("started_at", "finishes_at")
    def serialize_mission_datetime(self, value: datetime | None) -> str | None:
        return serialize_datetime(value)


class GalaxyResourceMissionResultResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    target_galaxy: int
    target_system: int
    metal_found: int
    crystal_found: int
    danger: str
    danger_level: int
    transport_lost: bool
    cargo_loss_percent: int
    description: str
    completed_at: datetime | None = None

    @field_serializer("completed_at")
    def serialize_completed_at(self, value: datetime | None) -> str | None:
        return serialize_datetime(value)


class GalaxyResourceMissionStateResponse(BaseModel):
    active_mission: GalaxyResourceMissionResponse | None = None
    last_result: GalaxyResourceMissionResultResponse | None = None