from datetime import datetime
from typing import List, Optional
from sqlalchemy import String, Integer, Boolean, DateTime, JSON, Index
from sqlalchemy.orm import Mapped, mapped_column, relationship
from backend.models.base import Base, generate_uuid, utc_now


class Monitor(Base):
    __tablename__ = "monitors"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    url: Mapped[str] = mapped_column(String(2048), nullable=False)
    interval_seconds: Mapped[int] = mapped_column(Integer, default=60, nullable=False)
    timeout_seconds: Mapped[int] = mapped_column(Integer, default=10, nullable=False)
    expected_status_codes: Mapped[List[int]] = mapped_column(JSON, default=[200], nullable=False)
    enabled: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False, index=True)

    # Status: PENDING, UP, DEGRADED, DOWN, RECOVERED
    current_status: Mapped[str] = mapped_column(String(20), default="PENDING", nullable=False)
    consecutive_failures: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, onupdate=utc_now, nullable=False)
    next_check_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, nullable=False, index=True)
    last_checked_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    # Relationships
    checks: Mapped[List["CheckResult"]] = relationship(
        "CheckResult",
        back_populates="monitor",
        cascade="all, delete-orphan",
        order_by="desc(CheckResult.checked_at)"
    )
    incidents: Mapped[List["Incident"]] = relationship(
        "Incident",
        back_populates="monitor",
        cascade="all, delete-orphan",
        order_by="desc(Incident.started_at)"
    )
