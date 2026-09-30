from pydantic import BaseModel


class BuildingResponse(BaseModel):
    code: str
    name: str
    description: str
    level: int


class BuildingsResponse(BaseModel):
    buildings: list[BuildingResponse]