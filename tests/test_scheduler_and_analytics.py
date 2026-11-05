import asyncio
import pytest
from datetime import timedelta
from unittest.mock import AsyncMock, patch
from backend.models.monitor import Monitor
from backend.models.base import utc_now
from backend.repositories.monitor_repo import MonitorRepository
from backend.repositories.check_result_repo import CheckResultRepository
from backend.services.analytics import AnalyticsService
from backend.services.scheduler import MonitoringScheduler, CheckRunner
from backend.services.checker import CheckExecutionResult


@pytest.mark.asyncio
async def test_analytics_uptime_and_latency_calculations(test_db_session):
    monitor_repo = MonitorRepository(test_db_session)
    check_repo = CheckResultRepository(test_db_session)
    analytics = AnalyticsService(test_db_session)

    monitor = await monitor_repo.create(Monitor(
        name="Metrics Endpoint",
        url="https://metrics.example.com",
        current_status="UP"
    ))

    # Record 4 successful checks and 1 failure (total 5 checks -> 80% uptime)
    await check_repo.record_result(monitor.id, latency_ms=100.0, success=True, status_code=200)
    await check_repo.record_result(monitor.id, latency_ms=120.0, success=True, status_code=200)
    await check_repo.record_result(monitor.id, latency_ms=140.0, success=True, status_code=200)
    await check_repo.record_result(monitor.id, latency_ms=160.0, success=True, status_code=200)
    await check_repo.record_result(monitor.id, latency_ms=0.0, success=False, status_code=500, error_message="Internal Error")

    metrics = await analytics.get_monitor_metrics(monitor.id, hours=24)
    assert metrics["total_checks"] == 5
    assert metrics["uptime_percentage"] == 80.0
    # Latencies: 100, 120, 140, 160, 0 -> sum = 520 / 5 = 104.0
    assert metrics["average_latency_ms"] == 104.0
    assert metrics["min_latency_ms"] == 0.0
    assert metrics["max_latency_ms"] == 160.0


@pytest.mark.asyncio
async def test_scheduler_deduplication_and_tick(test_db_session, monkeypatch):
    monitor_repo = MonitorRepository(test_db_session)

    # Monitor 1: Due now
    m1 = await monitor_repo.create(Monitor(
        name="Due Monitor",
        url="https://due.example.com",
        enabled=True,
        next_check_at=utc_now() - timedelta(seconds=10)
    ))

    # Monitor 2: Future check, not due
    m2 = await monitor_repo.create(Monitor(
        name="Future Monitor",
        url="https://future.example.com",
        enabled=True,
        next_check_at=utc_now() + timedelta(seconds=300)
    ))

    # Monitor 3: Disabled monitor
    m3 = await monitor_repo.create(Monitor(
        name="Disabled Monitor",
        url="https://disabled.example.com",
        enabled=False,
        next_check_at=utc_now() - timedelta(seconds=10)
    ))

    scheduler = MonitoringScheduler()

    # Mock AsyncSessionLocal in scheduler to return our test db
    from contextlib import asynccontextmanager
    @asynccontextmanager
    async def mock_session():
        yield test_db_session

    monkeypatch.setattr("backend.services.scheduler.AsyncSessionLocal", mock_session)

    # Mock CheckRunner.run_single_check with a pending future to simulate in-flight execution
    slow_event = asyncio.Event()
    async def mock_slow_check(monitor_id):
        await slow_event.wait()

    monkeypatch.setattr("backend.services.scheduler.CheckRunner.run_single_check", mock_slow_check)

    # Tick 1: Should dispatch only m1
    dispatched = await scheduler.run_tick()
    assert dispatched == 1
    assert m1.id in scheduler._in_flight

    # Tick 2: m1 is currently in_flight, so duplicate check is prevented!
    dispatched_second = await scheduler.run_tick()
    assert dispatched_second == 0

    # Release the slow check task
    slow_event.set()
    await asyncio.sleep(0.01)
    assert m1.id not in scheduler._in_flight
