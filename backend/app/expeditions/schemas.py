from datetime import datetime

from pydantic import BaseModel, Field


class ExpeditionFleetPayload(BaseModel):
    scout: int = Field(default=0, ge=0)
    transport: int = Field(default=0, ge=0)
    fighter: int = Field(default=0, ge=0)


class StartExpeditionRequest(BaseModel):
    ships: ExpeditionFleetPayload


class ExpeditionResultPayload(BaseModel):
    outcome: str
    metal_found: int = 0
    crystal_found: int = 0
    lost_ships: dict[str, int] = Field(default_factory=dict)
    returned_ships: dict[str, int] = Field(default_factory=dict)
    description: str


class ExpeditionQueueResponse(BaseModel):
    id: int
    started_at: datetime
    finishes_at: datetime
    remaining_seconds: int
    sent_ships: dict[str, int]


class ExpeditionResponse(BaseModel):
    active_expedition: ExpeditionQueueResponse | None
    last_result: ExpeditionResultPayload | None