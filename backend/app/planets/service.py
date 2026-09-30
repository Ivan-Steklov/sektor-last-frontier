from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.planets.models import Planet
from app.planets.repository import (
    add_planet,
    add_user,
    get_planet_by_user_id,
    get_user_by_telegram_id,
)
from app.planets.schemas import HomePlanetResponse
from app.users.models import User


def coordinates_for_user(user_id: int) -> tuple[int, int, int]:
    index = user_id - 1
    galaxy = 1
    system = (index // 15) + 1
    position = (index % 15) + 1
    return galaxy, system, position


def get_or_create_home_planet(
    db: Session,
    telegram_id: int,
    username: str | None = None,
) -> HomePlanetResponse:
    user = get_user_by_telegram_id(db, telegram_id)

    if user is None:
        user = add_user(
            db,
            User(telegram_id=telegram_id, username=username),
        )

    planet = get_planet_by_user_id(db, user.id)

    if planet is None:
        galaxy, system, position = coordinates_for_user(user.id)
        planet = add_planet(
            db,
            Planet(
                user_id=user.id,
                name="Новая Заря",
                galaxy=galaxy,
                system=system,
                position=position,
            ),
        )

    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        user = get_user_by_telegram_id(db, telegram_id)
        if user is None:
            raise
        planet = get_planet_by_user_id(db, user.id)
        if planet is None:
            raise

    return _to_response(user, planet)


def _to_response(user: User, planet: Planet) -> HomePlanetResponse:
    return HomePlanetResponse(
        id=planet.id,
        name=planet.name,
        galaxy=planet.galaxy,
        system=planet.system,
        position=planet.position,
        telegram_id=user.telegram_id,
        username=user.username,
    )