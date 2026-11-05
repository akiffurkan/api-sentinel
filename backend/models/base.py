import uuid
from datetime import datetime, timezone
from typing import Optional
from sqlalchemy.orm import DeclarativeBase


def utc_now() -> datetime:
    """Return timezone-aware current UTC datetime."""
    return datetime.now(timezone.utc)


def ensure_utc(dt: Optional[datetime]) -> Optional[datetime]:
    """Ensure datetime is timezone-aware in UTC."""
    if dt is None:
        return None
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc)


def generate_uuid() -> str:
    """Generate a UUID4 string."""
    return str(uuid.uuid4())


class Base(DeclarativeBase):
    pass
