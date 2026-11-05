from enum import Enum
from typing import Optional
from pydantic import BaseModel


class StatusEnum(str, Enum):
    PENDING = "PENDING"
    UP = "UP"
    DEGRADED = "DEGRADED"
    DOWN = "DOWN"
    RECOVERED = "RECOVERED"


class IncidentStatusEnum(str, Enum):
    OPEN = "OPEN"
    RESOLVED = "RESOLVED"


class HealthResponse(BaseModel):
    status: str
    version: str
    database: str
    uptime_seconds: float


class MessageResponse(BaseModel):
    message: str
    success: bool = True
