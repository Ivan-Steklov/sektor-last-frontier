from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db import Base


class SystemStorage(Base):
    __tablename__ = "system_storages"

    __table_args__ = (
        UniqueConstraint(
            "planet_id",
            "galaxy",
            "system",
            name="uq_system_storage_planet_coordinates",
        ),
    )

    id: Mapped[int] = mapped_column(primary_key=True)

    planet_id: Mapped[int] = mapped_column(
        ForeignKey("planets.id"),
        index=True,
    )

    galaxy: Mapped[int] = mapped_column(Integer)
    system: Mapped[int] = mapped_column(Integer)

    metal: Mapped[int] = mapped_column(
        Integer,
        default=0,
        server_default="0",
    )
    crystal: Mapped[int] = mapped_column(
        Integer,
        default=0,
        server_default="0",
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
    )