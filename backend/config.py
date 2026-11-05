from functools import lru_cache
from typing import List, Optional
from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )

    APP_NAME: str = "API Sentinel"
    APP_VERSION: str = "1.0.0"
    APP_ENV: str = "production"  # development, staging, production
    DEBUG: bool = False

    HOST: str = "0.0.0.0"
    PORT: int = 8000

    DATABASE_URL: str = "sqlite+aiosqlite:///./data/sentinel.db"

    # Admin Token Authentication
    ADMIN_TOKEN: Optional[str] = Field(
        default=None,
        description="Admin secret bearer token for API access"
    )

    # Telegram Outage & Recovery Notifications
    TELEGRAM_BOT_TOKEN: Optional[str] = Field(default=None)
    TELEGRAM_CHAT_ID: Optional[str] = Field(default=None)

    # Checker Engine Configuration
    DEFAULT_INTERVAL: int = 60  # seconds
    DEFAULT_TIMEOUT: int = 10   # seconds
    MAX_CONCURRENT_CHECKS: int = 20
    WORKER_POLL_INTERVAL: float = 2.0  # seconds

    # SSRF & Network Security Restrictions
    ALLOWED_PORTS: List[int] = [80, 443, 8080, 8443]
    MAX_RESPONSE_BYTES: int = 1024 * 1024  # 1 MB max response inspection
    MAX_REDIRECTS: int = 3  # re-validated redirects

    # CORS
    CORS_ORIGINS: str = "http://localhost:5173,http://localhost:3000,http://127.0.0.1:5173"

    @property
    def cors_origins_list(self) -> List[str]:
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",") if origin.strip()]


@lru_cache()
def get_settings() -> Settings:
    return Settings()
