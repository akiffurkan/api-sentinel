import pytest
from unittest.mock import AsyncMock, patch, MagicMock
from backend.services.notifier import TelegramNotifier
from backend.core.security import mask_secret


def test_mask_secret():
    assert mask_secret(None) == "Not Configured"
    assert mask_secret("") == "Not Configured"
    assert mask_secret("12345") == "***"
    assert mask_secret("1234567890abcdef") == "1234...cdef"


@pytest.mark.asyncio
async def test_notifier_send_outage_alert():
    mock_post = AsyncMock()
    mock_response = MagicMock()
    mock_response.status_code = 200
    mock_post.return_value = mock_response

    with patch("httpx.AsyncClient.post", mock_post):
        success = await TelegramNotifier.send_outage_alert(
            monitor_name="Stripe Webhook",
            monitor_url="https://api.stripe.com/health",
            reason="Connection timeout after 10s",
            timestamp_str="2026-11-05 12:00:00"
        )

    assert success is True
    assert mock_post.call_count == 1
    call_args = mock_post.call_args
    payload = call_args.kwargs["json"]
    assert "🚨" in payload["text"]
    assert "Stripe Webhook" in payload["text"]
    assert "DOWN" in payload["text"]


@pytest.mark.asyncio
async def test_notifier_send_recovery_alert():
    mock_post = AsyncMock()
    mock_response = MagicMock()
    mock_response.status_code = 200
    mock_post.return_value = mock_response

    with patch("httpx.AsyncClient.post", mock_post):
        success = await TelegramNotifier.send_recovery_alert(
            monitor_name="Stripe Webhook",
            monitor_url="https://api.stripe.com/health",
            duration_str="4m 12s",
            timestamp_str="2026-11-05 12:04:12"
        )

    assert success is True
    assert mock_post.call_count == 1
    call_args = mock_post.call_args
    payload = call_args.kwargs["json"]
    assert "✅" in payload["text"]
    assert "RECOVERED" in payload["text"]
    assert "4m 12s" in payload["text"]
