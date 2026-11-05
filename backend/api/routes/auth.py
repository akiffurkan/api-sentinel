from typing import Dict, Any
from fastapi import APIRouter, Depends
from backend.api.deps import verify_admin_token
from backend.config import get_settings
from backend.core.security import mask_secret
from backend.services.notifier import TelegramNotifier

router = APIRouter(prefix="/api", tags=["Auth & Settings"])


@router.get("/auth/status")
async def get_auth_status() -> Dict[str, Any]:
    """Check if server has an ADMIN_TOKEN configured."""
    settings = get_settings()
    return {
        "auth_required": bool(settings.ADMIN_TOKEN),
        "app_name": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "app_env": settings.APP_ENV
    }


@router.post("/auth/verify")
async def verify_token(_auth: bool = Depends(verify_admin_token)) -> Dict[str, Any]:
    """Verify admin token validity."""
    return {"valid": True, "message": "Admin authorization verified."}


@router.get("/settings/info")
async def get_settings_info(_auth: bool = Depends(verify_admin_token)) -> Dict[str, Any]:
    """Retrieve operational settings and integration status without leaking secrets."""
    settings = get_settings()
    return {
        "telegram": {
            "configured": TelegramNotifier.is_configured(),
            "bot_token": mask_secret(settings.TELEGRAM_BOT_TOKEN),
            "chat_id": mask_secret(settings.TELEGRAM_CHAT_ID),
        },
        "engine": {
            "default_interval": settings.DEFAULT_INTERVAL,
            "default_timeout": settings.DEFAULT_TIMEOUT,
            "max_concurrent_checks": settings.MAX_CONCURRENT_CHECKS,
            "worker_poll_interval": settings.WORKER_POLL_INTERVAL,
        },
        "security": {
            "allowed_ports": settings.ALLOWED_PORTS,
            "max_redirects": settings.MAX_REDIRECTS,
            "max_response_bytes": settings.MAX_RESPONSE_BYTES,
        }
    }


@router.post("/settings/telegram-test")
async def test_telegram_alert(_auth: bool = Depends(verify_admin_token)) -> Dict[str, Any]:
    """Send a test alert through Telegram."""
    return await TelegramNotifier.test_alert()
