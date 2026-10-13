from datetime import datetime

from pydantic import BaseModel


class ShipItemResponse(BaseModel):
    code: str
    name: str
    description: str
    role: str
    attack: int
    defense: int
    speed: int
    cargo_capacity: int
    fuel_usage: int
    quantity: int
    build_metal_cost: int
    build_crystal_cost: int
    build_seconds: int
    required_shipyard_level: int
    requirements_met: bool
    can_build: bool
    is_in_queue: bool


class ShipQueueResponse(BaseModel):
    id: int
    ship_code: str
    ship_name: str
    quantity: int
    started_at: datetime
    finishes_at: datetime
    remaining_seconds: int


class ShipListResponse(BaseModel):
    ships: list[ShipItemResponse]
    queue: ShipQueueResponse | None