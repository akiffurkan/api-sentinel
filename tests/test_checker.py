import pytest
from unittest.mock import AsyncMock, patch, MagicMock
import httpx
from backend.services.checker import HTTPChecker


@pytest.mark.asyncio
async def test_checker_success(monkeypatch):
    # Mock SSRF validation so we don't depend on public internet
    monkeypatch.setattr(
        "backend.services.checker.validate_monitor_url",
        lambda url, allowed_ports=None: (url, ["93.184.216.34"])
    )

    mock_response = MagicMock(spec=httpx.Response)
    mock_response.status_code = 200
    mock_response.is_redirect = False
    mock_response.url = httpx.URL("https://example.com/api")
    mock_response.headers = {}
    mock_response.aclose = AsyncMock()

    async def mock_iter(chunk_size=8192):
        yield b'{"status": "ok"}'

    mock_response.aiter_bytes = mock_iter

    mock_client = AsyncMock()
    mock_client.build_request.return_value = MagicMock()
    mock_client.send.return_value = mock_response
    mock_client.__aenter__.return_value = mock_client
    mock_client.__aexit__.return_value = None

    with patch("httpx.AsyncClient", return_value=mock_client):
        result = await HTTPChecker.perform_check(
            url="https://example.com/api",
            expected_status_codes=[200],
            timeout_seconds=5
        )

    assert result.success is True
    assert result.status_code == 200
    assert result.error_message is None
    assert result.latency_ms >= 0


@pytest.mark.asyncio
async def test_checker_unexpected_status_code(monkeypatch):
    monkeypatch.setattr(
        "backend.services.checker.validate_monitor_url",
        lambda url, allowed_ports=None: (url, ["93.184.216.34"])
    )

    mock_response = MagicMock(spec=httpx.Response)
    mock_response.status_code = 502
    mock_response.is_redirect = False
    mock_response.url = httpx.URL("https://example.com/api")
    mock_response.headers = {}
    mock_response.aclose = AsyncMock()

    async def mock_iter(chunk_size=8192):
        yield b"Bad Gateway"

    mock_response.aiter_bytes = mock_iter

    mock_client = AsyncMock()
    mock_client.build_request.return_value = MagicMock()
    mock_client.send.return_value = mock_response
    mock_client.__aenter__.return_value = mock_client
    mock_client.__aexit__.return_value = None

    with patch("httpx.AsyncClient", return_value=mock_client):
        result = await HTTPChecker.perform_check(
            url="https://example.com/api",
            expected_status_codes=[200, 201],
            timeout_seconds=5
        )

    assert result.success is False
    assert result.status_code == 502
    assert "Unexpected status code 502" in result.error_message


@pytest.mark.asyncio
async def test_checker_timeout(monkeypatch):
    monkeypatch.setattr(
        "backend.services.checker.validate_monitor_url",
        lambda url, allowed_ports=None: (url, ["93.184.216.34"])
    )

    mock_client = AsyncMock()
    mock_client.build_request.return_value = MagicMock()
    mock_client.send.side_effect = httpx.TimeoutException("Timeout")
    mock_client.__aenter__.return_value = mock_client
    mock_client.__aexit__.return_value = None

    with patch("httpx.AsyncClient", return_value=mock_client):
        result = await HTTPChecker.perform_check(
            url="https://example.com/api",
            expected_status_codes=[200],
            timeout_seconds=5
        )

    assert result.success is False
    assert result.status_code is None
    assert "timed out after 5s" in result.error_message


@pytest.mark.asyncio
async def test_checker_connect_error(monkeypatch):
    monkeypatch.setattr(
        "backend.services.checker.validate_monitor_url",
        lambda url, allowed_ports=None: (url, ["93.184.216.34"])
    )

    mock_client = AsyncMock()
    mock_client.build_request.return_value = MagicMock()
    mock_client.send.side_effect = httpx.ConnectError("Connection refused")
    mock_client.__aenter__.return_value = mock_client
    mock_client.__aexit__.return_value = None

    with patch("httpx.AsyncClient", return_value=mock_client):
        result = await HTTPChecker.perform_check(
            url="https://example.com/api",
            expected_status_codes=[200],
            timeout_seconds=5
        )

    assert result.success is False
    assert "Failed to establish connection" in result.error_message


@pytest.mark.asyncio
async def test_checker_blocks_redirect_to_internal_ip(monkeypatch):
    # Initial URL is valid
    call_count = 0

    def mock_validate(url, allowed_ports=None):
        nonlocal call_count
        call_count += 1
        if "127.0.0.1" in url or "localhost" in url:
            from backend.core.ssrf import SSRFValidationError
            raise SSRFValidationError("Target IP is private or loopback.")
        return url, ["93.184.216.34"]

    monkeypatch.setattr("backend.services.checker.validate_monitor_url", mock_validate)

    # Initial response is a redirect to loopback
    mock_response = MagicMock(spec=httpx.Response)
    mock_response.status_code = 302
    mock_response.is_redirect = True
    mock_response.url = httpx.URL("https://example.com/redirect")
    mock_response.headers = {"location": "http://127.0.0.1/admin"}
    mock_response.aclose = AsyncMock()

    async def mock_iter(chunk_size=8192):
        yield b""

    mock_response.aiter_bytes = mock_iter

    mock_client = AsyncMock()
    mock_client.build_request.return_value = MagicMock()
    mock_client.send.return_value = mock_response
    mock_client.__aenter__.return_value = mock_client
    mock_client.__aexit__.return_value = None

    with patch("httpx.AsyncClient", return_value=mock_client):
        result = await HTTPChecker.perform_check(
            url="https://example.com/redirect",
            expected_status_codes=[200],
            timeout_seconds=5
        )

    assert result.success is False
    assert "Security Policy Violation" in result.error_message
