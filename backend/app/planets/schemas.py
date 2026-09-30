from pydantic import BaseModel


class HomePlanetResponse(BaseModel):
    id: int
    name: str
    galaxy: int
    system: int
    position: int
    telegram_id: int
    username: str | None