from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db import Base


class ResourceState(Base):
    __tablename__ = "resource_states"

    id: Mapped[int] = mapped_column(primary_key=True)
    planet_id: Mapped[int] = mapped_column(
        ForeignKey("planets.id"),
        unique=True,
        index=True,
    )
    metal: Mapped[int] = mapped_column(Integer, default=500)
    crystal: Mapped[int] = mapped_column(Integer, default=200)
    population: Mapped[int] = mapped_column(Integer, default=100)
    last_calculated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
    )