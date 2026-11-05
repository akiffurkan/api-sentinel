import html
import logging
from typing import Optional, Dict, Any
import httpx
from backend.config import get_settings
from backend.core.security import mask_secret

logger = logging.getLogger("apisentinel.notifier")


class TelegramNotifier:
    TELEGRAM_API_BASE = "https://api.telegram.org"

    @classmethod
    def is_configured(cls) -> bool:
        settings = get_settings()
        return bool(settings.TELEGRAM_BOT_TOKEN and settings.TELEGRAM_CHAT_ID)

    @classmethod
    async def _send_message(cls, text: str) -> bool:
        settings = get_settings()
        if not cls.is_configured():
            logger.debug("Telegram notifications skipped: TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID not configured.")
            return False

        token = settings.TELEGRAM_BOT_TOKEN
        chat_id = settings.TELEGRAM_CHAT_ID
        url = f"{cls.TELEGRAM_API_BASE}/bot{token}/sendMessage"

        payload = {
            "chat_id": chat_id,
            "text": text,
            "parse_mode": "HTML",
            "disable_web_page_preview": True,
        }

        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                resp = await client.post(url, json=payload)
                if resp.status_code == 200:
                    logger.info("Telegram alert dispatched successfully.")
                    return True
                else:
                    logger.error(f"Telegram API responded with status {resp.status_code}: {resp.text}")
                    return False
        except Exception as e:
            logger.error(f"Failed to send Telegram alert: {type(e).__name__}")
            return False

    @classmethod
    async def send_outage_alert(
        cls,
        monitor_name: str,
        monitor_url: str,
        reason: str,
        timestamp_str: str
    ) -> bool:
        safe_name = html.escape(monitor_name)
        safe_url = html.escape(monitor_url)
        safe_reason = html.escape(reason)
        safe_time = html.escape(timestamp_str)

        text = (
            f"🚨 <b>API Sentinel Outage Alert</b>\n\n"
            f"<b>Monitor:</b> {safe_name}\n"
            f"<b>URL:</b> <code>{safe_url}</code>\n"
            f"<b>Status:</b> 🔴 <b>DOWN</b>\n"
            f"<b>Reason:</b> {safe_reason}\n"
            f"<b>Timestamp:</b> {safe_time} UTC\n\n"
            f"<i>Investigate at your API Sentinel dashboard.</i>"
        )
        return await cls._send_message(text)

    @classmethod
    async def send_recovery_alert(
        cls,
        monitor_name: str,
        monitor_url: str,
        duration_str: str,
        timestamp_str: str
    ) -> bool:
        safe_name = html.escape(monitor_name)
        safe_url = html.escape(monitor_url)
        safe_duration = html.escape(duration_str)
        safe_time = html.escape(timestamp_str)

        text = (
            f"✅ <b>API Sentinel Recovery Alert</b>\n\n"
            f"<b>Monitor:</b> {safe_name}\n"
            f"<b>URL:</b> <code>{safe_url}</code>\n"
            f"<b>Status:</b> 🟢 <b>RECOVERED</b>\n"
            f"<b>Outage Duration:</b> {safe_duration}\n"
            f"<b>Timestamp:</b> {safe_time} UTC\n\n"
            f"<i>Your endpoint is responding normally again.</i>"
        )
        return await cls._send_message(text)

    @classmethod
    async def test_alert(cls) -> Dict[str, Any]:
        """Test the Telegram configuration."""
        settings = get_settings()
        if not cls.is_configured():
            return {
                "success": False,
                "message": "Telegram is not configured. Please set TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID in environment.",
                "bot_token": mask_secret(settings.TELEGRAM_BOT_TOKEN),
                "chat_id": mask_secret(settings.TELEGRAM_CHAT_ID)
            }

        text = (
            f"🔔 <b>API Sentinel Test Notification</b>\n\n"
            f"This is a confirmation test message from API Sentinel.\n"
            f"Your Telegram bot configuration is active and working correctly!"
        )
        success = await cls._send_message(text)
        return {
            "success": success,
            "message": "Telegram test message sent successfully." if success else "Failed to dispatch test message. Check bot token and chat ID permissions.",
            "bot_token": mask_secret(settings.TELEGRAM_BOT_TOKEN),
            "chat_id": mask_secret(settings.TELEGRAM_CHAT_ID)
        }
