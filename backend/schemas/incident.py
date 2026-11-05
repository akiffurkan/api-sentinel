from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict
from backend.schemas.common import IncidentStatusEnum


class IncidentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    monitor_id: str
    monitor_name: Optional[str] = None
    monitor_url: Optional[str] = None
    status: IncidentStatusEnum
    reason: str
    started_at: datetime
    resolved_at: Optional[datetime] = None
    duration_seconds: Optional[float] = None
