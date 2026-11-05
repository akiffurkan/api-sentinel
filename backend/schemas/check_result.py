from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict


class CheckResultResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    monitor_id: str
    status_code: Optional[int] = None
    latency_ms: float
    success: bool
    error_message: Optional[str] = None
    checked_at: datetime
