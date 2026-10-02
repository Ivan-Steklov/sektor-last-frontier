from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.db import get_db
from app.galaxy.schemas import GalaxySectorResponse
from app.galaxy.service import get_galaxy_sector


router = APIRouter(
    prefix="/galaxy",
    tags=["galaxy"],
)


@router.get(
    "/sector",
    response_model=GalaxySectorResponse,
)
def read_galaxy_sector(
    telegram_id: int = 1,
    radius: int = Query(default=3, ge=1, le=5),
    db: Session = Depends(get_db),
) -> GalaxySectorResponse:
    return get_galaxy_sector(
        db=db,
        telegram_id=telegram_id,
        radius=radius,
    )