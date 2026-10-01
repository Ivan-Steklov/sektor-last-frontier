from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.buildings.schemas import BuildingsResponse
from app.buildings.service import (
    BuildingQueueBusyError,
    UnknownBuildingError,
    get_current_buildings,
    start_building_upgrade,
)
from app.db import get_db
from app.planets.service import get_or_create_home_planet
from app.resources.service import NotEnoughResourcesError


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


@router.post(
    "/{building_code}/upgrade",
    response_model=BuildingsResponse,
)
def upgrade_building(
    building_code: str,
    telegram_id: int = 1,
    db: Session = Depends(get_db),
) -> BuildingsResponse:
    planet = get_or_create_home_planet(db, telegram_id)

    try:
        start_building_upgrade(
            db=db,
            planet_id=planet.id,
            building_code=building_code,
        )
    except UnknownBuildingError:
        raise HTTPException(
            status_code=404,
            detail="Такого здания не существует.",
        )
    except BuildingQueueBusyError:
        raise HTTPException(
            status_code=409,
            detail="Очередь строительства уже занята.",
        )
    except NotEnoughResourcesError:
        raise HTTPException(
            status_code=400,
            detail="Недостаточно ресурсов.",
        )

    return get_current_buildings(
        db,
        planet.id,
    )