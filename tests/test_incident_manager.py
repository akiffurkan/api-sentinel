import pytest
from unittest.mock import AsyncMock
from backend.models.monitor import Monitor
from backend.repositories.monitor_repo import MonitorRepository
from backend.repositories.incident_repo import IncidentRepository
from backend.services.incident_manager import IncidentManager


@pytest.mark.asyncio
async def test_incident_lifecycle(test_db_session, monkeypatch):
    # Mock Telegram notification calls
    mock_send_outage = AsyncMock(return_value=True)
    mock_send_recovery = AsyncMock(return_value=True)
    monkeypatch.setattr("backend.services.notifier.TelegramNotifier.send_outage_alert", mock_send_outage)
    monkeypatch.setattr("backend.services.notifier.TelegramNotifier.send_recovery_alert", mock_send_recovery)

    monitor_repo = MonitorRepository(test_db_session)
    incident_repo = IncidentRepository(test_db_session)
    mgr = IncidentManager(test_db_session)

    # Create test monitor
    monitor = Monitor(
        name="Payment Gateway",
        url="https://api.payment.example/health",
        interval_seconds=60,
        timeout_seconds=5,
        expected_status_codes=[200],
        enabled=True,
        current_status="PENDING",
        consecutive_failures=0
    )
    monitor = await monitor_repo.create(monitor)

    # 1. First failure -> DEGRADED, no incident, no notification
    status, inc = await mgr.handle_check_outcome(monitor, success=False, error_message="HTTP 500")
    assert status == "DEGRADED"
    assert monitor.current_status == "DEGRADED"
    assert monitor.consecutive_failures == 1
    assert inc is None
    assert mock_send_outage.call_count == 0

    open_incidents = await incident_repo.list_incidents(status_filter="OPEN", monitor_id=monitor.id)
    assert len(open_incidents) == 0

    # 2. Second consecutive failure -> DOWN, opens incident, sends outage alert
    status, inc = await mgr.handle_check_outcome(monitor, success=False, error_message="HTTP 500")
    assert status == "DOWN"
    assert monitor.current_status == "DOWN"
    assert monitor.consecutive_failures == 2
    assert inc is not None
    assert inc.status == "OPEN"
    assert mock_send_outage.call_count == 1

    open_incidents = await incident_repo.list_incidents(status_filter="OPEN", monitor_id=monitor.id)
    assert len(open_incidents) == 1
    first_incident_id = open_incidents[0].id

    # 3. Third consecutive failure -> remains DOWN, duplicate incident prevented, no notification spam
    status, inc = await mgr.handle_check_outcome(monitor, success=False, error_message="HTTP 500")
    assert status == "DOWN"
    assert monitor.consecutive_failures == 3
    assert inc.id == first_incident_id
    assert mock_send_outage.call_count == 1  # Still 1, no duplicate notification

    open_incidents_after = await incident_repo.list_incidents(status_filter="OPEN", monitor_id=monitor.id)
    assert len(open_incidents_after) == 1

    # 4. Check succeeds -> RECOVERED, incident resolved, recovery alert sent
    status, inc = await mgr.handle_check_outcome(monitor, success=True)
    assert status == "RECOVERED"
    assert monitor.current_status == "RECOVERED"
    assert monitor.consecutive_failures == 0
    assert inc is not None
    assert inc.status == "RESOLVED"
    assert inc.resolved_at is not None
    assert mock_send_recovery.call_count == 1

    open_incidents_now = await incident_repo.list_incidents(status_filter="OPEN", monitor_id=monitor.id)
    assert len(open_incidents_now) == 0

    # 5. Subsequent success -> UP
    status, inc = await mgr.handle_check_outcome(monitor, success=True)
    assert status == "UP"
    assert monitor.current_status == "UP"
    assert monitor.consecutive_failures == 0
    assert inc is None
    assert mock_send_recovery.call_count == 1
