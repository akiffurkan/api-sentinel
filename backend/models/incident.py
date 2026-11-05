from datetime import datetime
from typing import Optional
from sqlalchemy import String, DateTime, ForeignKey, Index, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from backend.models.base import Base, generate_uuid, utc_now


class Incident(Base):
    __tablename__ = "incidents"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    monitor_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("monitors.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    status: Mapped[str] = mapped_column(String(20), default="OPEN", nullable=False, index=True)  # OPEN, RESOLVED
    reason: Mapped[str] = mapped_column(Text, nullable=False)
    started_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, nullable=False, index=True)
    resolved_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    monitor: Mapped["Monitor"] = relationship("Monitor", back_populates="incidents")

    __table_args__ = (
        Index("ix_incidents_monitor_status", "monitor_id", "status"),
    )
