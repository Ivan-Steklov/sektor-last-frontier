from datetime import datetime
from typing import Literal

from pydantic import BaseModel


MissionType = Literal["scout", "harvest", "expedition", "attack", "transport"]
MissionStatus = Literal["active", "completed"]


class ExpeditionFleetRequest(BaseModel):
    scout: int = 0
    transport: int = 0
    fighter: int = 0


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