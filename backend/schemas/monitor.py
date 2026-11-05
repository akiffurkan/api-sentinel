from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, Field, ConfigDict, field_validator
from backend.schemas.common import StatusEnum
from backend.schemas.check_result import CheckResultResponse
from backend.schemas.incident import IncidentResponse


class MonitorBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=120, description="Friendly monitor name")
    url: str = Field(..., min_length=1, max_length=2048, description="Target HTTP/HTTPS URL")
    interval_seconds: int = Field(default=60, ge=10, le=86400, description="Check interval in seconds (10s - 24h)")
    timeout_seconds: int = Field(default=10, ge=1, le=60, description="Request timeout in seconds (1s - 60s)")
    expected_status_codes: List[int] = Field(default=[200], description="Expected HTTP response status codes")
    enabled: bool = Field(default=True, description="Whether monitoring is active")

    @field_validator("expected_status_codes")
    @classmethod
    def validate_codes(cls, v: List[int]) -> List[int]:
        if not v:
            raise ValueError("At least one expected status code is required.")
        for code in v:
            if not (100 <= code <= 599):
                raise ValueError(f"Invalid HTTP status code {code}. Must be between 100 and 599.")
        return sorted(list(set(v)))


class MonitorCreate(MonitorBase):
    pass


class MonitorUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=120)
    url: Optional[str] = Field(None, min_length=1, max_length=2048)
    interval_seconds: Optional[int] = Field(None, ge=10, le=86400)
    timeout_seconds: Optional[int] = Field(None, ge=1, le=60)
    expected_status_codes: Optional[List[int]] = None
    enabled: Optional[bool] = None

    @field_validator("expected_status_codes")
    @classmethod
    def validate_codes(cls, v: Optional[List[int]]) -> Optional[List[int]]:
        if v is None:
            return None
        if not v:
            raise ValueError("Expected status codes list cannot be empty.")
        for code in v:
            if not (100 <= code <= 599):
                raise ValueError(f"Invalid HTTP status code {code}. Must be between 100 and 599.")
        return sorted(list(set(v)))


class MonitorResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    name: str
    url: str
    interval_seconds: int
    timeout_seconds: int
    expected_status_codes: List[int]
    enabled: bool
    current_status: StatusEnum
    consecutive_failures: int
    created_at: datetime
    updated_at: datetime
    next_check_at: datetime
    last_checked_at: Optional[datetime] = None

    # Calculated metrics
    uptime_percentage: Optional[float] = None
    average_latency_ms: Optional[float] = None


class MonitorDetailResponse(MonitorResponse):
    p95_latency_ms: Optional[float] = None
    min_latency_ms: Optional[float] = None
    max_latency_ms: Optional[float] = None
    total_checks_count: int = 0
    recent_checks: List[CheckResultResponse] = []
    active_incident: Optional[IncidentResponse] = None
    recent_incidents: List[IncidentResponse] = []
