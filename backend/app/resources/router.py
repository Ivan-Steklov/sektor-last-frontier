from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db import get_db
from app.planets.service import get_or_create_home_planet
from app.resources.schemas import ResourcesResponse
from app.resources.service import get_current_resources


router = APIRouter(prefix="/resources", tags=["resources"])


@router.get("/current", response_model=ResourcesResponse)
def read_current_resources(
    telegram_id: int = 1,
    db: Session = Depends(get_db),
) -> ResourcesResponse:
    planet = get_or_create_home_planet(db, telegram_id)
    return get_current_resources(db, planet.id)