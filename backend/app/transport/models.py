from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Index, Integer, String, func, text
from sqlalchemy.orm import Mapped, mapped_column

from app.db import Base


class TransportMission(Base):
    __tablename__ = "transport_missions"

    __table_args__ = (
        Index(
            "ix_transport_mission_one_active_per_planet",
            "planet_id",
            unique=True,
            postgresql_where=text("status = 'active'"),
            sqlite_where=text("status = 'active'"),
        ),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    planet_id: Mapped[int] = mapped_column(
        ForeignKey("planets.id"),
        index=True,
    )
    status: Mapped[str] = mapped_column(
        String(32),
        index=True,
        default="active",
    )
    target_galaxy: Mapped[int] = mapped_column(Integer)
    target_system: Mapped[int] = mapped_column(Integer)
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
    transport_count: Mapped[int] = mapped_column(
        Integer,
        default=1,
        server_default="1",
    )
    started_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    finishes_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    completed_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
    )