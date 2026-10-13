from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field


MissionType = Literal["scout", "harvest", "expedition", "attack", "transport"]
MissionStatus = Literal["active", "completed"]


class ExpeditionFleetRequest(BaseModel):
    # scout оставлен для совместимости старых клиентов,
    # но новая экспедиционная логика его не использует.
    scout: int = Field(default=0, ge=0)

    transport: int = Field(default=0, ge=0)
    heavy_transport: int = Field(default=0, ge=0)
    fighter: int = Field(default=0, ge=0)
    corvette: int = Field(default=0, ge=0)


class StartMissionRequest(BaseModel):
    telegram_id: int
    type: MissionType
    target_galaxy: int | None = None
    target_system: int | None = None
    metal: int | None = None
    crystal: int | None = None
    ships: ExpeditionFleetRequest | None = None


class MissionItemResponse(BaseModel):
    source: str
    type: MissionType
    status: MissionStatus
    title: str
    started_at: datetime
    finishes_at: datetime | None = None
    completed_at: datetime | None = None
    details: dict


class MissionsStateResponse(BaseModel):
    items: list[MissionItemResponse]