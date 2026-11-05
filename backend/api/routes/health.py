import time
from fastapi import APIRouter, Depends
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession
from backend.api.deps import get_db
from backend.config import get_settings
from backend.schemas.common import HealthResponse

router = APIRouter(tags=["Health"])

START_TIME = time.time()


@router.get("/healthz", response_model=HealthResponse)
async def health_check(db: AsyncSession = Depends(get_db)):
    """Application health endpoint for Docker, orchestrators, and uptime monitors."""
    settings = get_settings()

    db_status = "ok"
    try:
        await db.execute(text("SELECT 1"))
    except Exception:
        db_status = "error"

    uptime = round(time.time() - START_TIME, 1)

    return HealthResponse(
        status="ok" if db_status == "ok" else "degraded",
        version=settings.APP_VERSION,
        database=db_status,
        uptime_seconds=uptime
    )
