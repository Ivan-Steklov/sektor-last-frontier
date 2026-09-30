from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db import get_db
from app.planets.schemas import HomePlanetResponse
from app.planets.service import get_or_create_home_planet


router = APIRouter(prefix="/planets", tags=["planets"])


@router.get("/home", response_model=HomePlanetResponse)
def read_home_planet(
    telegram_id: int = 1,
    db: Session = Depends(get_db),
) -> HomePlanetResponse:
    return get_or_create_home_planet(db, telegram_id)