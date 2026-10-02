from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Index, Integer, JSON, String, UniqueConstraint, func, text
from sqlalchemy.orm import Mapped, mapped_column

from app.db import Base


class GalaxyScoutMission(Base):
    __tablename__ = "galaxy_scout_missions"

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
    started_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    finishes_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    completed_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )
    result_payload: Mapped[dict | None] = mapped_column(
        JSON,
        nullable=True,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
    )


class GalaxyKnownSystem(Base):
    __tablename__ = "galaxy_known_systems"

    __table_args__ = (
        UniqueConstraint(
            "planet_id",
            "target_galaxy",
            "target_system",
            name="uq_galaxy_known_system_planet_target",
        ),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    planet_id: Mapped[int] = mapped_column(
        ForeignKey("planets.id"),
        index=True,
    )
    target_galaxy: Mapped[int] = mapped_column(Integer, index=True)
    target_system: Mapped[int] = mapped_column(Integer, index=True)
    report_payload: Mapped[dict] = mapped_column(JSON)
    discovered_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))


class GalaxyResourceMission(Base):
    __tablename__ = "galaxy_resource_missions"

    __table_args__ = (
        Index(
            "ix_galaxy_resource_mission_one_active_per_planet",
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
    started_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    finishes_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    completed_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )
    result_payload: Mapped[dict | None] = mapped_column(
        JSON,
        nullable=True,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
    )