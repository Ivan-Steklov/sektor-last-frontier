from datetime import datetime

from pydantic import BaseModel


class ResourcesResponse(BaseModel):
    metal: int
    crystal: int
    energy: int
    population: int

    metal_per_hour: int
    crystal_per_hour: int

    energy_produced: int
    energy_consumed: int
    energy_efficiency_percent: int

    warehouse_capacity: int
    calculated_at: datetime