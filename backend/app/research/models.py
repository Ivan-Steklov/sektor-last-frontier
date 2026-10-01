from datetime import datetime

from sqlalchemy import (
    DateTime,
    ForeignKey,
    Integer,
    String,
    UniqueConstraint,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.db import Base


class ResearchState(Base):
    __tablename__ = "research_states"
    __table_args__ = (
        UniqueConstraint(
            "planet_id",
            "research_code",
            name="uq_planet_research",
        ),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    planet_id: Mapped[int] = mapped_column(
        ForeignKey("planets.id"),
        index=True,
    )
    research_code: Mapped[str] = mapped_column(String(32))
    level: Mapped[int] = mapped_column(
        Integer,
        default=0,
        server_default="0",
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
    )


class ResearchQueueItem(Base):
    __tablename__ = "research_queue_items"

    id: Mapped[int] = mapped_column(primary_key=True)
    planet_id: Mapped[int] = mapped_column(
        ForeignKey("planets.id"),
        index=True,
    )
    research_code: Mapped[str] = mapped_column(String(32))
    target_level: Mapped[int] = mapped_column(Integer)
    status: Mapped[str] = mapped_column(String(32), default="active")
    started_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    finishes_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    completed_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )