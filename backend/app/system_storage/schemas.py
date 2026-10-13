from datetime import datetime

from pydantic import BaseModel


class SystemStorageItemResponse(BaseModel):
    id: int
    galaxy: int
    system: int
    metal: int
    crystal: int
    created_at: datetime
    updated_at: datetime


class SystemStorageStateResponse(BaseModel):
    storages: list[SystemStorageItemResponse]