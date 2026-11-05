import pytest
from unittest.mock import AsyncMock
from backend.models.monitor import Monitor
from backend.repositories.monitor_repo import MonitorRepository
from backend.services.incident_manager import IncidentManager


@pytest.mark.asyncio
async def test_healthz_endpoint(client):
    res = await client.get("/healthz")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] in ("ok", "degraded")
    assert "version" in data
    assert "database" in data
    assert "uptime_seconds" in data
    # Does not leak internal tokens or IPs
    assert "token" not in str(data).lower()
    assert "secret" not in str(data).lower()


@pytest.mark.asyncio
async def test_overview_and_incidents(client, auth_headers, test_db_session, monkeypatch):
    monkeypatch.setattr("backend.services.notifier.TelegramNotifier.send_outage_alert", AsyncMock(return_value=True))
    monkeypatch.setattr("backend.services.notifier.TelegramNotifier.send_recovery_alert", AsyncMock(return_value=True))

    monitor_repo = MonitorRepository(test_db_session)
    mgr = IncidentManager(test_db_session)

    # Create 2 monitors: one UP, one DOWN
    m1 = await monitor_repo.create(Monitor(
        name="Billing API",
        url="https://billing.example.com",
        current_status="UP",
        enabled=True
    ))

    m2 = await monitor_repo.create(Monitor(
        name="Auth Service",
        url="https://auth.example.com",
        current_status="UP",
        enabled=True
    ))

    # Trigger failure on m2 to cause DOWN and open an incident
    await mgr.handle_check_outcome(m2, success=False, error_message="503 Service Unavailable")
    await mgr.handle_check_outcome(m2, success=False, error_message="503 Service Unavailable")

    # Call Overview
    overview_res = await client.get("/api/overview", headers=auth_headers)
    assert overview_res.status_code == 200
    data = overview_res.json()

    assert data["monitors_count"]["total"] == 2
    assert data["monitors_count"]["up"] == 1
    assert data["monitors_count"]["down"] == 1
    assert data["open_incidents_count"] == 1
    assert "uptime_calculation_note" in data
    assert len(data["recent_incidents"]) == 1
    assert data["recent_incidents"][0]["monitor_id"] == m2.id

    # Call Incidents list
    incidents_res = await client.get("/api/incidents", headers=auth_headers)
    assert incidents_res.status_code == 200
    inc_list = incidents_res.json()
    assert len(inc_list) == 1
    assert inc_list[0]["status"] == "OPEN"
    assert "503 Service Unavailable" in inc_list[0]["reason"]

    # Filter incidents by status
    resolved_res = await client.get("/api/incidents?status=RESOLVED", headers=auth_headers)
    assert resolved_res.status_code == 200
    assert len(resolved_res.json()) == 0
