from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel
from backend.schemas.monitor import MonitorResponse
from backend.schemas.incident import IncidentResponse


class OverviewCounts(BaseModel):
    total: int = 0
    up: int = 0
    degraded: int = 0
    down: int = 0
    recovered: int = 0
    pending: int = 0
    paused: int = 0


class OverviewMetricsResponse(BaseModel):
    monitors_count: OverviewCounts
    overall_uptime_percentage: float = 100.0
    uptime_calculation_note: str = "Estimated availability calculated from persisted check results over the recorded window."
    average_latency_ms: float = 0.0
    open_incidents_count: int = 0
    monitors: List[MonitorResponse] = []
    recent_incidents: List[IncidentResponse] = []
