from datetime import datetime

from pydantic import BaseModel


class BuildingResponse(BaseModel):
    code: str
    name: str
    description: str
    level: int
    next_level: int
    upgrade_metal_cost: int
    upgrade_crystal_cost: int
    upgrade_seconds: int
    can_upgrade: bool
    is_in_queue: bool


class BuildingQueueResponse(BaseModel):
    id: int
    building_code: str
    building_name: str
    target_level: int
    started_at: datetime
    finishes_at: datetime
    remaining_seconds: int


class BuildingsResponse(BaseModel):
    buildings: list[BuildingResponse]
    queue: BuildingQueueResponse | None