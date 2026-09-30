from sqlalchemy import select
from sqlalchemy.orm import Session

from app.planets.models import Planet
from app.users.models import User


def get_user_by_telegram_id(db: Session, telegram_id: int) -> User | None:
    return db.scalar(select(User).where(User.telegram_id == telegram_id))


def get_planet_by_user_id(db: Session, user_id: int) -> Planet | None:
    return db.scalar(select(Planet).where(Planet.user_id == user_id))


def add_user(db: Session, user: User) -> User:
    db.add(user)
    db.flush()
    return user


def add_planet(db: Session, planet: Planet) -> Planet:
    db.add(planet)
    db.flush()
    return planet