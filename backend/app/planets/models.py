from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, String, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db import Base


class Planet(Base):
    __tablename__ = "planets"
    __table_args__ = (
        UniqueConstraint(
            "galaxy",
            "system",
            "position",
            name="uq_planet_coordinates",
        ),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), unique=True)
    name: Mapped[str] = mapped_column(String(64))
    galaxy: Mapped[int] = mapped_column(Integer)
    system: Mapped[int] = mapped_column(Integer)
    position: Mapped[int] = mapped_column(Integer)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
    )