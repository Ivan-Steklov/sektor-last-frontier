from datetime import datetime

from pydantic import BaseModel


class ResearchItemResponse(BaseModel):
    code: str
    name: str
    description: str
    effect: str
    level: int
    next_level: int
    upgrade_metal_cost: int
    upgrade_crystal_cost: int
    upgrade_seconds: int
    required_research_center_level: int
    requirements_met: bool
    can_research: bool
    is_in_queue: bool


class ResearchQueueResponse(BaseModel):
    id: int
    research_code: str
    research_name: str
    target_level: int
    started_at: datetime
    finishes_at: datetime
    remaining_seconds: int


class ResearchListResponse(BaseModel):
    research: list[ResearchItemResponse]
    queue: ResearchQueueResponse | None