from datetime import datetime
from typing import Optional
from sqlalchemy import String, Integer, Float, Boolean, DateTime, ForeignKey, Index, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from backend.models.base import Base, generate_uuid, utc_now


class CheckResult(Base):
    __tablename__ = "check_results"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    monitor_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("monitors.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    status_code: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    latency_ms: Mapped[float] = mapped_column(Float, nullable=False)
    success: Mapped[bool] = mapped_column(Boolean, nullable=False, index=True)
    error_message: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    checked_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, nullable=False, index=True)

    monitor: Mapped["Monitor"] = relationship("Monitor", back_populates="checks")

    __table_args__ = (
        Index("ix_check_results_monitor_checked", "monitor_id", "checked_at"),
    )
