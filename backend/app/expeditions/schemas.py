from datetime import datetime

from pydantic import BaseModel, Field


class ExpeditionFleetPayload(BaseModel):
    # Оставляем scout для обратной совместимости старых клиентов,
    # но новая логика экспедиций его не использует.
    scout: int = Field(default=0, ge=0)

    transport: int = Field(default=0, ge=0)
    heavy_transport: int = Field(default=0, ge=0)
    fighter: int = Field(default=0, ge=0)
    corvette: int = Field(default=0, ge=0)


class StartExpeditionRequest(BaseModel):
    ships: ExpeditionFleetPayload


class ExpeditionResultPayload(BaseModel):
    outcome: str
    metal_found: int = 0
    crystal_found: int = 0
    lost_ships: dict[str, int] = Field(default_factory=dict)
    returned_ships: dict[str, int] = Field(default_factory=dict)
    description: str
    cargo_capacity: int = 0
    attack_power: int = 0
    defense_power: int = 0


class ExpeditionQueueResponse(BaseModel):
    id: int
    started_at: datetime
    finishes_at: datetime
    remaining_seconds: int
    sent_ships: dict[str, int]
    cargo_capacity: int = 0
    attack_power: int = 0
    defense_power: int = 0


class ExpeditionResponse(BaseModel):
    active_expedition: ExpeditionQueueResponse | None
    last_result: ExpeditionResultPayload | None