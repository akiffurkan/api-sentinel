from typing import AsyncGenerator
from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession
from backend.core.database import get_db
from backend.core.security import verify_admin_token

# Re-export for route dependency injection
__all__ = ["get_db", "verify_admin_token"]
