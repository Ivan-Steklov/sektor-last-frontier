from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.buildings.schemas import BuildingsResponse
from app.buildings.service import get_current_buildings
from app.db import get_db
from app.planets.service import get_or_create_home_planet


router = APIRouter(
    prefix="/buildings",
    tags=["buildings"],
)


@router.get(
    "/current",
    response_model=BuildingsResponse,
)
def read_current_buildings(
    telegram_id: int = 1,
    db: Session = Depends(get_db),
) -> BuildingsResponse:
    planet = get_or_create_home_planet(db, telegram_id)

    return get_current_buildings(
        db,
        planet.id,
    )