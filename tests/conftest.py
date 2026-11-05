import os

# Set test environment variables before importing backend modules
TEST_ADMIN_TOKEN = "test-admin-secret-token-123456789"
os.environ["APP_ENV"] = "testing"
os.environ["ADMIN_TOKEN"] = TEST_ADMIN_TOKEN
os.environ["TELEGRAM_BOT_TOKEN"] = "mock_telegram_bot_token"
os.environ["TELEGRAM_CHAT_ID"] = "mock_chat_id_123"
os.environ["DATABASE_URL"] = "sqlite+aiosqlite:///:memory:"

import pytest
import pytest_asyncio
from typing import AsyncGenerator
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from backend.config import Settings, get_settings

get_settings.cache_clear()

from backend.core.database import get_db
from backend.models.base import Base
from backend.main import create_app


@pytest_asyncio.fixture
async def test_db_session() -> AsyncGenerator[AsyncSession, None]:
    """Provides an isolated in-memory SQLite database session for each test."""
    test_engine = create_async_engine(
        "sqlite+aiosqlite:///:memory:",
        echo=False,
        connect_args={"check_same_thread": False}
    )

    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async_session = async_sessionmaker(
        bind=test_engine,
        class_=AsyncSession,
        expire_on_commit=False,
        autocommit=False,
        autoflush=False
    )

    async with async_session() as session:
        yield session

    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)

    await test_engine.dispose()


@pytest_asyncio.fixture
async def client(test_db_session: AsyncSession) -> AsyncGenerator[AsyncClient, None]:
    """Test HTTP client with overridden database dependency."""
    app = create_app()
    app.dependency_overrides[get_db] = lambda: test_db_session

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as ac:
        yield ac


@pytest.fixture
def auth_headers() -> dict:
    return {"Authorization": f"Bearer {TEST_ADMIN_TOKEN}"}


@pytest.fixture
def api_key_headers() -> dict:
    return {"X-API-Key": TEST_ADMIN_TOKEN}
