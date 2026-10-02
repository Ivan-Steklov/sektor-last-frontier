from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.db import get_db
from app.galaxy.schemas import (
    GalaxyResourceMissionStateResponse,
    GalaxyScoutStateResponse,
    GalaxySectorResponse,
    StartGalaxyResourceMissionRequest,
    StartGalaxyScoutRequest,
)
from app.galaxy.service import (
    GalaxyResourceMissionBusyError,
    GalaxyResourceMissionInvalidTargetError,
    GalaxyResourceMissionTargetNotScoutedError,
    GalaxyScoutInvalidTargetError,
    GalaxyScoutMissionBusyError,
    GalaxyScoutTargetTooFarError,
    NotEnoughScoutsError,
    NotEnoughTransportsError,
    get_galaxy_resource_mission_state,
    get_galaxy_scout_state,
    get_galaxy_sector,
    start_galaxy_resource_mission,
    start_galaxy_scout_mission,
)


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


@router.get(
    "/scout/current",
    response_model=GalaxyScoutStateResponse,
)
def read_galaxy_scout_state(
    telegram_id: int = 1,
    db: Session = Depends(get_db),
) -> GalaxyScoutStateResponse:
    return get_galaxy_scout_state(
        db=db,
        telegram_id=telegram_id,
    )


@router.post(
    "/scout/start",
    response_model=GalaxyScoutStateResponse,
)
def create_galaxy_scout_mission(
    payload: StartGalaxyScoutRequest,
    telegram_id: int = 1,
    db: Session = Depends(get_db),
) -> GalaxyScoutStateResponse:
    try:
        start_galaxy_scout_mission(
            db=db,
            telegram_id=telegram_id,
            target_galaxy=payload.target_galaxy,
            target_system=payload.target_system,
        )
    except GalaxyScoutMissionBusyError:
        raise HTTPException(
            status_code=409,
            detail="Разведка уже выполняется.",
        )
    except GalaxyScoutTargetTooFarError:
        raise HTTPException(
            status_code=400,
            detail="Система слишком далеко для разведки.",
        )
    except GalaxyScoutInvalidTargetError:
        raise HTTPException(
            status_code=400,
            detail="Недопустимая цель разведки.",
        )
    except NotEnoughScoutsError:
        raise HTTPException(
            status_code=400,
            detail="Для разведки нужен хотя бы один разведчик.",
        )

    return get_galaxy_scout_state(
        db=db,
        telegram_id=telegram_id,
    )


@router.get(
    "/resource-mission/current",
    response_model=GalaxyResourceMissionStateResponse,
)
def read_galaxy_resource_mission_state(
    telegram_id: int = 1,
    db: Session = Depends(get_db),
) -> GalaxyResourceMissionStateResponse:
    return get_galaxy_resource_mission_state(
        db=db,
        telegram_id=telegram_id,
    )


@router.post(
    "/resource-mission/start",
    response_model=GalaxyResourceMissionStateResponse,
)
def create_galaxy_resource_mission(
    payload: StartGalaxyResourceMissionRequest,
    telegram_id: int = 1,
    db: Session = Depends(get_db),
) -> GalaxyResourceMissionStateResponse:
    try:
        start_galaxy_resource_mission(
            db=db,
            telegram_id=telegram_id,
            target_galaxy=payload.target_galaxy,
            target_system=payload.target_system,
        )
    except GalaxyResourceMissionBusyError:
        raise HTTPException(
            status_code=409,
            detail="Добывающая миссия уже выполняется.",
        )
    except GalaxyResourceMissionTargetNotScoutedError:
        raise HTTPException(
            status_code=400,
            detail="Сначала нужно разведать систему.",
        )
    except GalaxyResourceMissionInvalidTargetError:
        raise HTTPException(
            status_code=400,
            detail="Недопустимая цель добывающей миссии.",
        )
    except NotEnoughTransportsError:
        raise HTTPException(
            status_code=400,
            detail="Для добывающей миссии нужен транспорт.",
        )

    return get_galaxy_resource_mission_state(
        db=db,
        telegram_id=telegram_id,
    )