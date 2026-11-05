from typing import List, Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from backend.api.deps import get_db, verify_admin_token
from backend.models.base import ensure_utc
from backend.repositories.incident_repo import IncidentRepository
from backend.schemas.incident import IncidentResponse

router = APIRouter(prefix="/api/incidents", tags=["Incidents"])


@router.get("", response_model=List[IncidentResponse])
async def list_incidents(
    status: Optional[str] = Query(None, description="Filter by status (OPEN, RESOLVED)"),
    monitor_id: Optional[str] = Query(None, description="Filter by specific monitor ID"),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
    _auth: bool = Depends(verify_admin_token),
):
    """List operational incidents with duration, failure reasons, and affected endpoints."""
    repo = IncidentRepository(db)
    incidents = await repo.list_incidents(
        status_filter=status,
        monitor_id=monitor_id,
        limit=limit,
        offset=offset
    )

    results = []
    for inc in incidents:
        duration = None
        if inc.resolved_at and inc.started_at:
            duration = (ensure_utc(inc.resolved_at) - ensure_utc(inc.started_at)).total_seconds()

        resp = IncidentResponse(
            id=inc.id,
            monitor_id=inc.monitor_id,
            monitor_name=inc.monitor.name if inc.monitor else "Deleted Monitor",
            monitor_url=inc.monitor.url if inc.monitor else None,
            status=inc.status,
            reason=inc.reason,
            started_at=inc.started_at,
            resolved_at=inc.resolved_at,
            duration_seconds=duration
        )
        results.append(resp)

    return results
