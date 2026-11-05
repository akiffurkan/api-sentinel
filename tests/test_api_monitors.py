import pytest
from unittest.mock import AsyncMock
from backend.services.checker import CheckExecutionResult


@pytest.mark.asyncio
async def test_auth_enforcement(client):
    # Unauthenticated request fails
    res = await client.get("/api/monitors")
    assert res.status_code == 401

    # Bad token fails
    res = await client.get("/api/monitors", headers={"Authorization": "Bearer wrong-token"})
    assert res.status_code == 401

    # Valid Bearer succeeds
    from tests.conftest import TEST_ADMIN_TOKEN
    res = await client.get("/api/monitors", headers={"Authorization": f"Bearer {TEST_ADMIN_TOKEN}"})
    assert res.status_code == 200
    assert res.json() == []

    # Valid X-API-Key succeeds
    res = await client.get("/api/monitors", headers={"X-API-Key": TEST_ADMIN_TOKEN})
    assert res.status_code == 200


@pytest.mark.asyncio
async def test_monitor_crud_and_ssrf(client, auth_headers, monkeypatch):
    # Mock SSRF validation so public domains are accepted without DNS network dependency
    def mock_validate(url, allowed_ports=None):
        if "127.0.0.1" in url or "localhost" in url:
            from backend.core.ssrf import SSRFValidationError
            raise SSRFValidationError("Target IP is loopback.")
        return url, ["93.184.216.34"]

    monkeypatch.setattr("backend.api.routes.monitors.validate_monitor_url", mock_validate)

    # 1. Try to create monitor with loopback URL -> Rejected (422)
    bad_payload = {
        "name": "Internal Service",
        "url": "http://127.0.0.1:8080/metrics",
        "interval_seconds": 30,
        "timeout_seconds": 5,
        "expected_status_codes": [200],
        "enabled": True
    }
    bad_res = await client.post("/api/monitors", json=bad_payload, headers=auth_headers)
    assert bad_res.status_code == 422
    assert "Security Validation Error" in bad_res.json()["detail"]

    # 2. Create valid monitor
    valid_payload = {
        "name": "Production API",
        "url": "https://api.example.com/v1/health",
        "interval_seconds": 60,
        "timeout_seconds": 10,
        "expected_status_codes": [200, 204],
        "enabled": True
    }
    create_res = await client.post("/api/monitors", json=valid_payload, headers=auth_headers)
    assert create_res.status_code == 201
    created_data = create_res.json()
    monitor_id = created_data["id"]
    assert created_data["name"] == "Production API"
    assert created_data["current_status"] == "PENDING"
    assert created_data["expected_status_codes"] == [200, 204]

    # 3. List monitors
    list_res = await client.get("/api/monitors", headers=auth_headers)
    assert list_res.status_code == 200
    monitors_list = list_res.json()
    assert len(monitors_list) == 1
    assert monitors_list[0]["id"] == monitor_id

    # 4. Get monitor details
    detail_res = await client.get(f"/api/monitors/{monitor_id}", headers=auth_headers)
    assert detail_res.status_code == 200
    detail_data = detail_res.json()
    assert detail_data["id"] == monitor_id
    assert "recent_checks" in detail_data
    assert "uptime_percentage" in detail_data

    # 5. Patch monitor
    update_payload = {"name": "Updated API Name", "interval_seconds": 120}
    patch_res = await client.patch(f"/api/monitors/{monitor_id}", json=update_payload, headers=auth_headers)
    assert patch_res.status_code == 200
    assert patch_res.json()["name"] == "Updated API Name"
    assert patch_res.json()["interval_seconds"] == 120

    # 6. Delete monitor
    del_res = await client.delete(f"/api/monitors/{monitor_id}", headers=auth_headers)
    assert del_res.status_code == 200
    assert del_res.json()["success"] is True

    # 7. Verify deletion
    not_found_res = await client.get(f"/api/monitors/{monitor_id}", headers=auth_headers)
    assert not_found_res.status_code == 404


@pytest.mark.asyncio
async def test_manual_check_now_action(client, auth_headers, monkeypatch):
    monkeypatch.setattr(
        "backend.api.routes.monitors.validate_monitor_url",
        lambda url, allowed_ports=None: (url, ["93.184.216.34"])
    )

    # Mock HTTPChecker execution
    mock_check_result = CheckExecutionResult(
        success=True,
        status_code=200,
        latency_ms=45.2,
        error_message=None
    )
    monkeypatch.setattr(
        "backend.services.scheduler.HTTPChecker.perform_check",
        AsyncMock(return_value=mock_check_result)
    )

    # Create monitor
    payload = {
        "name": "Check Now Test",
        "url": "https://api.example.com/status",
        "interval_seconds": 60,
        "timeout_seconds": 5,
        "expected_status_codes": [200],
        "enabled": True
    }
    create_res = await client.post("/api/monitors", json=payload, headers=auth_headers)
    monitor_id = create_res.json()["id"]

    # Trigger check now
    check_now_res = await client.post(f"/api/monitors/{monitor_id}/check-now", headers=auth_headers)
    assert check_now_res.status_code == 200
    data = check_now_res.json()
    assert data["monitor_id"] == monitor_id
    assert data["success"] is True
    assert data["status_code"] == 200
    assert data["latency_ms"] == 45.2

    # Query checks history
    checks_res = await client.get(f"/api/monitors/{monitor_id}/checks", headers=auth_headers)
    assert checks_res.status_code == 200
    checks = checks_res.json()
    assert len(checks) >= 1
    assert checks[0]["success"] is True
