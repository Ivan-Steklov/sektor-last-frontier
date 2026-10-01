from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db import get_db
from app.planets.service import get_or_create_home_planet
from app.resources.service import NotEnoughResourcesError
from app.ships.schemas import ShipListResponse
from app.ships.service import (
    InvalidShipQuantityError,
    ShipQueueBusyError,
    ShipRequirementsNotMetError,
    UnknownShipError,
    get_current_ships,
    start_ship_build,
)


router = APIRouter(
    prefix="/ships",
    tags=["ships"],
)


@router.get(
    "/current",
    response_model=ShipListResponse,
)
def read_current_ships(
    telegram_id: int = 1,
    db: Session = Depends(get_db),
) -> ShipListResponse:
    planet = get_or_create_home_planet(db, telegram_id)

    return get_current_ships(
        db,
        planet.id,
    )


@router.post(
    "/{ship_code}/build",
    response_model=ShipListResponse,
)
def build_ships(
    ship_code: str,
    quantity: int = 1,
    telegram_id: int = 1,
    db: Session = Depends(get_db),
) -> ShipListResponse:
    planet = get_or_create_home_planet(db, telegram_id)

    try:
        start_ship_build(
            db=db,
            planet_id=planet.id,
            ship_code=ship_code,
            quantity=quantity,
        )
    except UnknownShipError:
        raise HTTPException(
            status_code=404,
            detail="Такого корабля не существует.",
        )
    except InvalidShipQuantityError:
        raise HTTPException(
            status_code=400,
            detail="Количество кораблей должно быть больше нуля.",
        )
    except ShipQueueBusyError:
        raise HTTPException(
            status_code=409,
            detail="Верфь уже занята.",
        )
    except ShipRequirementsNotMetError:
        raise HTTPException(
            status_code=400,
            detail="Недостаточный уровень верфи.",
        )
    except NotEnoughResourcesError:
        raise HTTPException(
            status_code=400,
            detail="Недостаточно ресурсов.",
        )

    return get_current_ships(
        db,
        planet.id,
    )