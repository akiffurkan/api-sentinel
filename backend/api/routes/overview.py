from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from backend.api.deps import get_db, verify_admin_token
from backend.models.base import ensure_utc
from backend.repositories.monitor_repo import MonitorRepository
from backend.repositories.incident_repo import IncidentRepository
from backend.repositories.check_result_repo import CheckResultRepository
from backend.schemas.overview import OverviewMetricsResponse, OverviewCounts
from backend.schemas.monitor import MonitorResponse
from backend.schemas.incident import IncidentResponse
from backend.services.analytics import AnalyticsService

router = APIRouter(prefix="/api/overview", tags=["Overview"])


@router.get("", response_model=OverviewMetricsResponse)
async def get_overview(
    db: AsyncSession = Depends(get_db),
    _auth: bool = Depends(verify_admin_token),
):
    """Retrieve top-level operational metrics, status distribution, and recent incidents."""
    monitor_repo = MonitorRepository(db)
    incident_repo = IncidentRepository(db)
    check_repo = CheckResultRepository(db)
    analytics = AnalyticsService(db)

    monitors = await monitor_repo.list_all()

    counts = OverviewCounts()
    counts.total = len(monitors)

    monitor_responses = []
    for m in monitors:
        if not m.enabled:
            counts.paused += 1
        elif m.current_status == "UP":
            counts.up += 1
        elif m.current_status == "DEGRADED":
            counts.degraded += 1
        elif m.current_status == "DOWN":
            counts.down += 1
        elif m.current_status == "RECOVERED":
            counts.recovered += 1
        else:
            counts.pending += 1

        metrics = await analytics.get_monitor_metrics(m.id, hours=24)
        resp = MonitorResponse.model_validate(m)
        resp.uptime_percentage = metrics["uptime_percentage"]
        resp.average_latency_ms = metrics["average_latency_ms"]
        monitor_responses.append(resp)

    overall_uptime, avg_lat = await check_repo.get_global_metrics()
    open_incidents_count = await incident_repo.count_open_incidents()
    recent_incidents = await incident_repo.list_incidents(limit=5)

    recent_incidents_resp = [
        IncidentResponse(
            id=inc.id,
            monitor_id=inc.monitor_id,
            monitor_name=inc.monitor.name if inc.monitor else "Unknown",
            monitor_url=inc.monitor.url if inc.monitor else None,
            status=inc.status,
            reason=inc.reason,
            started_at=inc.started_at,
            resolved_at=inc.resolved_at,
            duration_seconds=(ensure_utc(inc.resolved_at) - ensure_utc(inc.started_at)).total_seconds() if inc.resolved_at else None
        )
        for inc in recent_incidents
    ]

    return OverviewMetricsResponse(
        monitors_count=counts,
        overall_uptime_percentage=overall_uptime,
        uptime_calculation_note="Estimated availability calculated from persisted check results over the recorded window.",
        average_latency_ms=avg_lat,
        open_incidents_count=open_incidents_count,
        monitors=monitor_responses,
        recent_incidents=recent_incidents_resp
    )
