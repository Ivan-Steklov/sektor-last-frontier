from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.buildings.catalog import BUILDINGS
from app.buildings.models import BuildingState
from app.buildings.repository import add_building, get_by_planet_id
from app.buildings.schemas import BuildingResponse, BuildingsResponse


def ensure_buildings(
    db: Session,
    planet_id: int,
) -> list[BuildingState]:
    existing_buildings = get_by_planet_id(db, planet_id)
    existing_codes = {
        building.building_code
        for building in existing_buildings
    }

    created_any = False

    for definition in BUILDINGS:
        if definition.code in existing_codes:
            continue

        add_building(
            db,
            BuildingState(
                planet_id=planet_id,
                building_code=definition.code,
                level=1,
            ),
        )
        created_any = True

    if created_any:
        try:
            db.commit()
        except IntegrityError:
            db.rollback()

    return get_by_planet_id(db, planet_id)


def get_current_buildings(
    db: Session,
    planet_id: int,
) -> BuildingsResponse:
    states = ensure_buildings(db, planet_id)
    states_by_code = {
        state.building_code: state
        for state in states
    }

    buildings = []

    for definition in BUILDINGS:
        state = states_by_code[definition.code]

        buildings.append(
            BuildingResponse(
                code=definition.code,
                name=definition.name,
                description=definition.description,
                level=state.level,
            )
        )

    return BuildingsResponse(buildings=buildings)