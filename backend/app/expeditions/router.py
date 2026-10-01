from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db import get_db
from app.expeditions.schemas import ExpeditionResponse, StartExpeditionRequest
from app.expeditions.service import (
    ExpeditionBusyError,
    InvalidExpeditionFleetError,
    NotEnoughShipsError,
    get_current_expedition_state,
    start_expedition,
)
from app.planets.service import get_or_create_home_planet


router = APIRouter(
    prefix="/expeditions",
    tags=["expeditions"],
)


@router.get(
    "/current",
    response_model=ExpeditionResponse,
)
def read_current_expedition(
    telegram_id: int = 1,
    db: Session = Depends(get_db),
) -> ExpeditionResponse:
    planet = get_or_create_home_planet(db, telegram_id)

    return get_current_expedition_state(
        db,
        planet.id,
    )


@router.post(
    "/start",
    response_model=ExpeditionResponse,
)
def create_expedition(
    payload: StartExpeditionRequest,
    telegram_id: int = 1,
    db: Session = Depends(get_db),
) -> ExpeditionResponse:
    planet = get_or_create_home_planet(db, telegram_id)

    try:
        start_expedition(
            db=db,
            planet_id=planet.id,
            fleet=payload.ships,
        )
    except ExpeditionBusyError:
        raise HTTPException(
            status_code=409,
            detail="Экспедиция уже выполняется.",
        )
    except InvalidExpeditionFleetError:
        raise HTTPException(
            status_code=400,
            detail="Нужно отправить хотя бы один корабль.",
        )
    except NotEnoughShipsError:
        raise HTTPException(
            status_code=400,
            detail="Недостаточно кораблей для отправки.",
        )

    return get_current_expedition_state(
        db,
        planet.id,
    )