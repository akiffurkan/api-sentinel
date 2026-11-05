from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from backend.api.deps import get_db, verify_admin_token
from backend.core.ssrf import validate_monitor_url, SSRFValidationError
from backend.models.monitor import Monitor
from backend.models.base import utc_now, ensure_utc
from backend.repositories.monitor_repo import MonitorRepository
from backend.repositories.check_result_repo import CheckResultRepository
from backend.repositories.incident_repo import IncidentRepository
from backend.schemas.monitor import (
    MonitorCreate,
    MonitorUpdate,
    MonitorResponse,
    MonitorDetailResponse,
)
from backend.schemas.check_result import CheckResultResponse
from backend.schemas.incident import IncidentResponse
from backend.schemas.common import MessageResponse
from backend.services.analytics import AnalyticsService
from backend.services.scheduler import CheckRunner

router = APIRouter(prefix="/api/monitors", tags=["Monitors"])


@router.get("", response_model=List[MonitorResponse])
async def list_monitors(
    enabled_only: bool = Query(False, description="Filter only enabled monitors"),
    db: AsyncSession = Depends(get_db),
    _auth: bool = Depends(verify_admin_token),
):
    """List all configured endpoint monitors with computed uptime and latency."""
    repo = MonitorRepository(db)
    analytics = AnalyticsService(db)
    monitors = await repo.list_all(enabled_only=enabled_only)

    results = []
    for m in monitors:
        metrics = await analytics.get_monitor_metrics(m.id, hours=24)
        resp = MonitorResponse.model_validate(m)
        resp.uptime_percentage = metrics["uptime_percentage"]
        resp.average_latency_ms = metrics["average_latency_ms"]
        results.append(resp)

    return results


@router.post("", response_model=MonitorResponse, status_code=status.HTTP_201_CREATED)
async def create_monitor(
    payload: MonitorCreate,
    db: AsyncSession = Depends(get_db),
    _auth: bool = Depends(verify_admin_token),
):
    """Create a new HTTP/HTTPS endpoint monitor after validating against SSRF policy."""
    # SSRF Validation check on URL
    try:
        sanitized_url, _ = validate_monitor_url(str(payload.url))
    except SSRFValidationError as e:
        raise HTTPException(
            status_code=422,
            detail=f"Security Validation Error: {str(e)}"
        )

    monitor = Monitor(
        name=payload.name.strip(),
        url=sanitized_url,
        interval_seconds=payload.interval_seconds,
        timeout_seconds=payload.timeout_seconds,
        expected_status_codes=payload.expected_status_codes,
        enabled=payload.enabled,
        current_status="PENDING",
        consecutive_failures=0,
        next_check_at=utc_now(),  # Due immediately
    )

    repo = MonitorRepository(db)
    created = await repo.create(monitor)

    resp = MonitorResponse.model_validate(created)
    resp.uptime_percentage = 100.0
    resp.average_latency_ms = None
    return resp


@router.get("/{monitor_id}", response_model=MonitorDetailResponse)
async def get_monitor(
    monitor_id: str,
    db: AsyncSession = Depends(get_db),
    _auth: bool = Depends(verify_admin_token),
):
    """Get detailed monitor information, uptime analytics, recent checks, and incident history."""
    repo = MonitorRepository(db)
    monitor = await repo.get_by_id(monitor_id)
    if not monitor:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Monitor not found")

    analytics = AnalyticsService(db)
    metrics = await analytics.get_monitor_metrics(monitor.id, hours=24)

    check_repo = CheckResultRepository(db)
    recent_checks = await check_repo.get_checks_for_monitor(monitor.id, limit=50)

    incident_repo = IncidentRepository(db)
    active_inc = await incident_repo.get_active_incident(monitor.id)
    incidents_list = await incident_repo.list_incidents(monitor_id=monitor.id, limit=10)

    detail = MonitorDetailResponse.model_validate(monitor)
    detail.uptime_percentage = metrics["uptime_percentage"]
    detail.average_latency_ms = metrics["average_latency_ms"]
    detail.p95_latency_ms = metrics["p95_latency_ms"]
    detail.min_latency_ms = metrics["min_latency_ms"]
    detail.max_latency_ms = metrics["max_latency_ms"]
    detail.total_checks_count = metrics["total_checks"]
    detail.recent_checks = [CheckResultResponse.model_validate(c) for c in recent_checks]

    if active_inc:
        detail.active_incident = IncidentResponse(
            id=active_inc.id,
            monitor_id=active_inc.monitor_id,
            monitor_name=monitor.name,
            monitor_url=monitor.url,
            status=active_inc.status,
            reason=active_inc.reason,
            started_at=active_inc.started_at,
            resolved_at=active_inc.resolved_at,
        )

    detail.recent_incidents = [
        IncidentResponse(
            id=inc.id,
            monitor_id=inc.monitor_id,
            monitor_name=monitor.name,
            monitor_url=monitor.url,
            status=inc.status,
            reason=inc.reason,
            started_at=inc.started_at,
            resolved_at=inc.resolved_at,
            duration_seconds=(ensure_utc(inc.resolved_at) - ensure_utc(inc.started_at)).total_seconds() if inc.resolved_at else None
        )
        for inc in incidents_list
    ]

    return detail


@router.patch("/{monitor_id}", response_model=MonitorResponse)
async def update_monitor(
    monitor_id: str,
    payload: MonitorUpdate,
    db: AsyncSession = Depends(get_db),
    _auth: bool = Depends(verify_admin_token),
):
    """Update monitor parameters (name, URL, intervals, expected codes, enabled state)."""
    repo = MonitorRepository(db)
    monitor = await repo.get_by_id(monitor_id)
    if not monitor:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Monitor not found")

    if payload.url is not None:
        try:
            sanitized_url, _ = validate_monitor_url(str(payload.url))
            monitor.url = sanitized_url
        except SSRFValidationError as e:
            raise HTTPException(
                status_code=422,
                detail=f"Security Validation Error: {str(e)}"
            )

    if payload.name is not None:
        monitor.name = payload.name.strip()
    if payload.interval_seconds is not None:
        monitor.interval_seconds = payload.interval_seconds
    if payload.timeout_seconds is not None:
        monitor.timeout_seconds = payload.timeout_seconds
    if payload.expected_status_codes is not None:
        monitor.expected_status_codes = payload.expected_status_codes
    if payload.enabled is not None:
        monitor.enabled = payload.enabled
        if monitor.enabled and monitor.current_status == "PENDING":
            monitor.next_check_at = utc_now()

    updated = await repo.update(monitor)

    analytics = AnalyticsService(db)
    metrics = await analytics.get_monitor_metrics(updated.id, hours=24)
    resp = MonitorResponse.model_validate(updated)
    resp.uptime_percentage = metrics["uptime_percentage"]
    resp.average_latency_ms = metrics["average_latency_ms"]
    return resp


@router.delete("/{monitor_id}", response_model=MessageResponse)
async def delete_monitor(
    monitor_id: str,
    db: AsyncSession = Depends(get_db),
    _auth: bool = Depends(verify_admin_token),
):
    """Delete a monitor and its historical check results and incident logs."""
    repo = MonitorRepository(db)
    monitor = await repo.get_by_id(monitor_id)
    if not monitor:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Monitor not found")

    await repo.delete(monitor)
    return MessageResponse(message=f"Monitor '{monitor.name}' deleted successfully.")


@router.get("/{monitor_id}/checks", response_model=List[CheckResultResponse])
async def list_monitor_checks(
    monitor_id: str,
    limit: int = Query(50, ge=1, le=500),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
    _auth: bool = Depends(verify_admin_token),
):
    """Retrieve historical check execution logs for an endpoint monitor."""
    repo = MonitorRepository(db)
    monitor = await repo.get_by_id(monitor_id)
    if not monitor:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Monitor not found")

    check_repo = CheckResultRepository(db)
    checks = await check_repo.get_checks_for_monitor(monitor_id, limit=limit, offset=offset)
    return [CheckResultResponse.model_validate(c) for c in checks]


@router.post("/{monitor_id}/check-now", response_model=CheckResultResponse)
async def trigger_manual_check(
    monitor_id: str,
    db: AsyncSession = Depends(get_db),
    _auth: bool = Depends(verify_admin_token),
):
    """Trigger an immediate asynchronous check of the monitor."""
    repo = MonitorRepository(db)
    monitor = await repo.get_by_id(monitor_id)
    if not monitor:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Monitor not found")

    # Run check within this request
    check_outcome = await CheckRunner.run_single_check(monitor_id=monitor.id, session=db)

    # Fetch the recorded check result
    check_repo = CheckResultRepository(db)
    latest_checks = await check_repo.get_checks_for_monitor(monitor_id=monitor.id, limit=1)
    if latest_checks:
        return CheckResultResponse.model_validate(latest_checks[0])

    return CheckResultResponse(
        id="latest",
        monitor_id=monitor.id,
        status_code=check_outcome.status_code,
        latency_ms=check_outcome.latency_ms,
        success=check_outcome.success,
        error_message=check_outcome.error_message,
        checked_at=utc_now()
    )
