from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db import get_db
from app.planets.service import get_or_create_home_planet
from app.research.schemas import ResearchListResponse
from app.research.service import (
    ResearchQueueBusyError,
    ResearchRequirementsNotMetError,
    UnknownResearchError,
    get_current_research,
    start_research,
)
from app.resources.service import NotEnoughResourcesError


router = APIRouter(
    prefix="/research",
    tags=["research"],
)


@router.get(
    "/current",
    response_model=ResearchListResponse,
)
def read_current_research(
    telegram_id: int = 1,
    db: Session = Depends(get_db),
) -> ResearchListResponse:
    planet = get_or_create_home_planet(db, telegram_id)

    return get_current_research(
        db,
        planet.id,
    )


@router.post(
    "/{research_code}/upgrade",
    response_model=ResearchListResponse,
)
def upgrade_research(
    research_code: str,
    telegram_id: int = 1,
    db: Session = Depends(get_db),
) -> ResearchListResponse:
    planet = get_or_create_home_planet(db, telegram_id)

    try:
        start_research(
            db=db,
            planet_id=planet.id,
            research_code=research_code,
        )
    except UnknownResearchError:
        raise HTTPException(
            status_code=404,
            detail="Такого исследования не существует.",
        )
    except ResearchQueueBusyError:
        raise HTTPException(
            status_code=409,
            detail="Очередь исследований уже занята.",
        )
    except ResearchRequirementsNotMetError as error:
        raise HTTPException(
            status_code=400,
            detail=error.message,
        )
    except NotEnoughResourcesError:
        raise HTTPException(
            status_code=400,
            detail="Недостаточно ресурсов.",
        )

    return get_current_research(
        db,
        planet.id,
    )